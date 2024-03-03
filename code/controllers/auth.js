import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import jwt from 'jsonwebtoken';
import { respondData, respondError } from '../utils/res.utils.js';
import { loginDto, registerDto, validationFailed } from '../dto/controllers.dto.js';
import { verifyAuth } from './utils.js';

/**
 * Register a new user in the system
- Request Parameters: None
- Request Body Content: An object having attributes `username`, `email` and `password`
  - Example: `{username: "Mario", email: "mario.red@email.com", password: "securePass"}`
- Response `data` Content: A message confirming successful insertion
  - Example: `res.status(200).json({data: {message: "User added successfully"}})`
- Returns a 400 error if the request body does not contain all the necessary attributes
- Returns a 400 error if at least one of the parameters in the request body is an empty string
- Returns a 400 error if the email in the request body is not in a valid email format
- Returns a 400 error if the username in the request body identifies an already existing user
- Returns a 400 error if the email in the request body identifies an already existing user
 */
export const register = async (req, res) => {
    try {
        if (await validationFailed(req, res, registerDto)) return respondError(res, 400, 'validation error');
        const { username, email, password } = req.body;

        const existingUser = await User.findOne(
            { $or: [{ email }, { username }] },
        );
        if (existingUser) return respondError(res, 400, 'you are already registered');

        const hashedPassword = await bcrypt.hash(password, 12);
        const newUser = await User.create({
            username,
            email,
            password: hashedPassword,
        });

        return respondData(res, { message: 'User added successfully' });
    } catch (error) {
        return respondError(res, 500, error.message);
    }
};

/**
 * Register a new user in the system with an Admin role
- Request Parameters: None
- Request Body Content: An object having attributes `username`, `email` and `password`
  - Example: `{username: "admin", email: "admin@email.com", password: "securePass"}`
- Response `data` Content: A message confirming successful insertion
  - Example: `res.status(200).json({data: {message: "User added successfully"}})`
- Returns a 400 error if the request body does not contain all the necessary attributes
- Returns a 400 error if at least one of the parameters in the request body is an empty string
- Returns a 400 error if the email in the request body is not in a valid email format
- Returns a 400 error if the username in the request body identifies an already existing user
- Returns a 400 error if the email in the request body identifies an already existing user
 */
export const registerAdmin = async (req, res) => {
    try {
        if (await validationFailed(req, res, registerDto)) return respondError(res, 400, 'validation error');
        const { username, email, password } = req.body;

        const existingUser = await User.findOne(
            { $or: [{ email }, { username }] },
        );
        if (existingUser) return respondError(res, 400, 'you are already registered');

        const hashedPassword = await bcrypt.hash(password, 12);
        const newUser = await User.create({
            username,
            email,
            password: hashedPassword,
            role: "Admin"
        });

        return respondData(res, { message: 'Admin added successfully' });
    } catch (error) {
        return respondError(res, 500, error.message);
    }

}

/**
 * Perform login 
- Request Parameters: None
- Request Body Content: An object having attributes `email` and `password`
  - Example: `{email: "mario.red@email.com", password: "securePass"}`
- Response `data` Content: An object with the created accessToken and refreshToken
  - Example: `res.status(200).json({data: {accessToken: accessToken, refreshToken: refreshToken}})`
- Returns a 400 error if the request body does not contain all the necessary attributes
- Returns a 400 error if at least one of the parameters in the request body is an empty string
- Returns a 400 error if the email in the request body is not in a valid email format
- Returns a 400 error if the email in the request body does not identify a user in the database
- Returns a 400 error if the supplied password does not match with the one in the database
 */
export const login = async (req, res) => {
    try {
        if (await validationFailed(req, res, loginDto)) return respondError(res, 400, 'validation error');

        const { email, password } = req.body;
        const existingUser = await User.findOne({ email: email })
        if (!existingUser) return respondError(res, 400, 'please you need to register');

        const match = await bcrypt.compare(password, existingUser.password);
        if (!match) return respondError(res, 400, 'wrong credentials');

        //CREATE ACCESSTOKEN
        const accessToken = jwt.sign({
            email: existingUser.email,
            id: existingUser.id,
            username: existingUser.username,
            role: existingUser.role
        }, process.env.ACCESS_KEY, { expiresIn: '1h' });
        //CREATE REFRESH TOKEN
        const refreshToken = jwt.sign({
            email: existingUser.email,
            id: existingUser.id,
            username: existingUser.username,
            role: existingUser.role
        }, process.env.ACCESS_KEY, { expiresIn: '7d' });
        //SAVE REFRESH TOKEN TO DB
        existingUser.refreshToken = refreshToken;
        await existingUser.save();

        res.cookie("accessToken", accessToken, { httpOnly: true, domain: "localhost", path: "/api", maxAge: 60 * 60 * 1000, sameSite: "none", secure: true })
        res.cookie('refreshToken', refreshToken, { httpOnly: true, domain: "localhost", path: '/api', maxAge: 7 * 24 * 60 * 60 * 1000, sameSite: 'none', secure: true })
        return respondData(res, { accessToken, refreshToken });
    } catch (error) {
        return respondError(res, 500, error.message);
    }
}

/**
 * Perform logout
  - Auth type: Simple
- Request Parameters: None
- Request Body Content: None
- Response `data` Content: A message confirming successful logout
  - Example: `res.status(200).json({data: {message: "User logged out"}})`
- Returns a 400 error if the request does not have a refresh token in the cookies
- Returns a 400 error if the refresh token in the request's cookies does not represent a user in the database
 */
export const logout = async (req, res) => {
    try {
        const { refreshToken } = req.cookies;
        if (!refreshToken) return respondError(res, 400, 'refresh token not found');
        
         const auth = verifyAuth(req, res, { authType: "Simple" });
         if (!auth.authorized) return respondError(res, 401, auth.cause);

        const user = await User.findOne( { refreshToken: refreshToken });
        if (!user) return respondError(res, 400, 'User not found');

        user.refreshToken = null;
        res.cookie("accessToken", "", { httpOnly: true, path: '/api', maxAge: 0, sameSite: 'none', secure: true });
        res.cookie('refreshToken', "", { httpOnly: true, path: '/api', maxAge: 0, sameSite: 'none', secure: true });
        await user.save();

        return respondData(res, { message: 'Logged out' });
    } catch (error) {
        return respondError(res, 500, error.message);
    }
}
