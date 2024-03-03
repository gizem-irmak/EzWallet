import { User } from '../models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { validationFailed } from '../dto/controllers.dto.js';
import { register, registerAdmin, login, logout,  } from '../controllers/auth.js';
import { verifyAuth } from '../controllers/utils.js';

jest.mock("bcryptjs")
jest.mock('../models/User.js');
jest.mock('jsonwebtoken');

jest.mock('../models/model');
jest.mock('../models/User')
jest.mock('../controllers/utils');
jest.mock('../controllers/controller.service');
jest.mock('../dto/controllers.dto')

const resetAllMocks = () => {
    const method = 'mockRestore' // 'mockRestore' | 'mockReset' | 'mockClear';
}

beforeEach(() => {
    jest.clearAllMocks();
});

afterEach(() => {
    jest.clearAllMocks();
});

beforeAll(() => {
    validationFailed.mockReturnValue(false);
})

describe('register', () => {

   beforeEach(resetAllMocks);

    let req;
    let res;

   beforeEach(() => {
     req = { body: {username: "user1", email: "user1@example.com", password: "securePass"} }; 
     res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {message: "User added successfully"}
     };
   });


   test('should return 400 if validation fails', async () => {

     validationFailed.mockReturnValue(true);

     await register(req, res);
     expect(res.status).toHaveBeenCalledWith(400);
     expect(res.json).toHaveBeenCalledWith({ error: 'validation error' });

   });


   test('should return 400 if user already exists with the same email', async () => {

     validationFailed.mockReturnValue(false);
    
     User.findOne.mockReturnValueOnce({
      name: "user1",
      _id: "123",
      email: "user1@example.com",
     });

     await register(req, res);
     expect(res.status).toHaveBeenCalledWith(400);
     expect(res.json).toHaveBeenCalledWith({ error: 'you are already registered' });

    });


   test('should return 400 if user already exists with the same username', async () => {

     validationFailed.mockReturnValue(false);

     User.findOne.mockReturnValueOnce({
      name: "user1",
      _id: "123",
      email: "user@example.com",
     });

     await register(req, res);
     expect(res.status).toHaveBeenCalledWith(400);
     expect(res.json).toHaveBeenCalledWith({ error: 'you are already registered' });

    });


   test('should create a new user and return success message', async () => {

     validationFailed.mockReturnValue(false);
    
     User.findOne.mockReturnValueOnce(null);

     bcrypt.hash = jest.fn().mockResolvedValueOnce('hashedPassword');

     User.create.mockReturnValueOnce({})

     await register(req, res);
     expect(bcrypt.hash).toHaveBeenCalledWith('securePass', 12);
     expect(User.create).toHaveBeenCalledWith({
       username: 'user1',
       email: 'user1@example.com',
       password: 'hashedPassword',
     });
     expect(res.status).toHaveBeenCalledWith(200);
     expect(res.json).toHaveBeenCalledWith({data: {message: "User added successfully"}});

    });

   test('should handle internal server error', async () => {

     validationFailed.mockReturnValue(false);
    
     User.findOne.mockRejectedValueOnce(new Error("Internal server error"));

     await register(req, res);
     expect(User.findOne).toHaveBeenCalled();
     expect(res.status).toHaveBeenCalledWith(500);
     expect(res.json).toHaveBeenCalledWith({ error: "Internal server error" });

    });

});


describe('registerAdmin', () => {

     beforeEach(resetAllMocks);

     let req;
     let res;

     beforeEach(() => {
     req = { body: {username: "admin", email: "admin@example.com", password: "securePass"} };
     res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {message: "User added successfully"} };
     });
     

   test('should return 400 if validation fails', async () => {

     validationFailed.mockReturnValue(true);

     await registerAdmin(req, res);
     expect(res.status).toHaveBeenCalledWith(400);
     expect(res.json).toHaveBeenCalledWith({ error: 'validation error' });

      });


   test('should return 400 if user already exists with the same email', async () => {

     validationFailed.mockReturnValue(false);
      
     User.findOne.mockReturnValueOnce({
      name: "admin",
      _id: "123",
      email: "admin@example.com",
     });

     await registerAdmin(req, res);
     expect(res.status).toHaveBeenCalledWith(400);
     expect(res.json).toHaveBeenCalledWith({ error: 'you are already registered' });

     });


   test('should return 400 if user already exists with the same username', async () => {

     validationFailed.mockReturnValue(false);
      
     User.findOne.mockReturnValueOnce({
      name: "admin",
      _id: "123",
      email: "admin1@example.com",
     });

     await registerAdmin(req, res);
     expect(res.status).toHaveBeenCalledWith(400);
     expect(res.json).toHaveBeenCalledWith({ error: 'you are already registered' });

     });


   test('should create a new admin user and return success message', async () => {

     validationFailed.mockReturnValue(false);

     User.findOne.mockReturnValueOnce(null);

     bcrypt.hash = jest.fn().mockResolvedValueOnce('hashedPassword');

     User.create.mockReturnValueOnce({})

     await registerAdmin(req, res);
     expect(bcrypt.hash).toHaveBeenCalledWith('securePass', 12);
     expect(User.create).toHaveBeenCalledWith({
      username: 'admin',
      email: 'admin@example.com',
      password: 'hashedPassword',
      role: 'Admin',
     });
     expect(res.status).toHaveBeenCalledWith(200);
     expect(res.json).toHaveBeenCalledWith({data: {message: "Admin added successfully"}});

    });


   test('should handle internal server error', async () => {

     validationFailed.mockReturnValue(false);
    
     User.findOne.mockRejectedValueOnce(new Error("Internal server error"));

     await registerAdmin(req, res);
     expect(User.findOne).toHaveBeenCalled();
     expect(res.status).toHaveBeenCalledWith(500);
     expect(res.json).toHaveBeenCalledWith({ error: "Internal server error" });

    });


});



describe('login', () => {

   beforeEach(resetAllMocks);

   let req;
   let res;

   beforeEach(() => {
     req = {body: {email: "user1@example.com", password: "securePass"}};
     res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      cookie: jest.fn(),
      locals: {}    };
   });


   test('should return 400 if validation fails', async () => {

     validationFailed.mockReturnValue(true);

     await login(req, res);
     expect(res.status).toHaveBeenCalledWith(400);
     expect(res.json).toHaveBeenCalledWith({ error: 'validation error' });

   });


   test('should return 400 if user does not exist', async () => {

     validationFailed.mockReturnValue(false);

     User.findOne.mockReturnValueOnce(null);

     await login(req, res);
     expect(res.status).toHaveBeenCalledWith(400);
     expect(res.json).toHaveBeenCalledWith({ error: 'please you need to register' });

  });


   test('should return 400 if wrong credentials are provided', async () => {

     validationFailed.mockReturnValue(false);

     User.findOne.mockReturnValueOnce({
      name: "admin",
      _id: "123",
      email: "admin@example.com",
     });

     bcrypt.compare = jest.fn().mockResolvedValueOnce(false);

     await login(req, res);

     expect(res.status).toHaveBeenCalledWith(400);
     expect(res.json).toHaveBeenCalledWith({ error: 'wrong credentials' });

  });


  test('should login user and return access token and refresh token', async () => {

     validationFailed.mockReturnValue(false);

     User.findOne.mockReturnValueOnce({
      username: "user1",
      id: "123",
      email: "user1@example.com",
      role: 'User',
      save: jest.fn(),
     });

     bcrypt.compare = jest.fn().mockResolvedValueOnce(true);

     jwt.sign = jest
      .fn()
      .mockReturnValueOnce('accessToken')
      .mockReturnValueOnce('refreshToken');

     await login(req, res);
     expect(jwt.sign).toHaveBeenCalledWith(
      {
         email: 'user1@example.com',
          id: '123',
          username: 'user1',
          role: 'User',
        },
        process.env.ACCESS_KEY,
        { expiresIn: '1h' }
      );
     expect(jwt.sign).toHaveBeenCalledWith(
       {
         email: 'user1@example.com',
         id: '123',
         username: 'user1',
         role: 'User',
       },
       process.env.ACCESS_KEY,
       { expiresIn: '7d' }
     );
    
     expect(res.status).toHaveBeenCalledWith(200);
     expect(res.json).toHaveBeenCalledWith({data: {accessToken: 'accessToken', refreshToken: 'refreshToken'}})

  });


  test('should handle internal server error', async () => {

     validationFailed.mockReturnValue(false);
    
     User.findOne.mockRejectedValueOnce(new Error("Internal server error"));

     await login(req, res);
     expect(User.findOne).toHaveBeenCalled();
     expect(res.status).toHaveBeenCalledWith(500);
     expect(res.json).toHaveBeenCalledWith({ error: "Internal server error" });

  });


});



describe('logout', () => {
  
  beforeEach(resetAllMocks);

   let req;
   let res;

  beforeEach(() => { req = { cookies: { refreshToken: 'valid-refresh-token' } };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      cookie: jest.fn(),
      locals: {}  
    };
   });

  afterEach(() => {
     jest.clearAllMocks();
   });


   test('should return 401 error if authorization fails', async () => {

      verifyAuth.mockReturnValueOnce({ authorized: false, authType: "Simple" });

     await logout(req, res);
     expect(verifyAuth).toHaveBeenCalledWith(req, res, { authType: 'Simple' });
     expect(User.findOne).not.toHaveBeenCalled();
     expect(res.status).toHaveBeenCalledWith(401);
     expect(res.json).toHaveBeenCalledWith({ error: undefined });
     expect(res.cookie).not.toHaveBeenCalled();

   });


   test('should return 400 error if user not found', async () => {

     verifyAuth.mockReturnValueOnce({ authorized: true, authType: "Simple" });

     jwt.verify.mockReturnValueOnce({});

     User.findOne.mockReturnValueOnce(null);

     await logout(req, res);
     expect(verifyAuth).toHaveBeenCalledWith(req, res, { authType: 'Simple' });
     expect(res.status).toHaveBeenCalledWith(400);
     expect(res.json).toHaveBeenCalledWith({ error: 'User not found' });
     expect(res.cookie).not.toHaveBeenCalled();

   });


   test('should logout user and clear tokens', async () => {

     verifyAuth.mockReturnValueOnce({ authorized: true, authType: "Simple" });
     jwt.verify.mockReturnValueOnce({});
     User.findOne.mockReturnValueOnce({ username: 'valid-refresh-token', save: jest.fn() });

     await logout(req, res);
     expect(verifyAuth).toHaveBeenCalledWith(req, res, { authType: 'Simple' });
     expect(res.status).toHaveBeenCalledWith(200);
     expect(res.json).toHaveBeenCalledWith({data: {message: "Logged out"}});

     });


   test('should handle internal server error', async () => {

     verifyAuth.mockReturnValueOnce({ authorized: true, authType: "Simple" });
     User.findOne.mockRejectedValueOnce(new Error("Internal server error"));

     await logout(req, res);
     expect(res.status).toHaveBeenCalledWith(500);
    
     });


});




