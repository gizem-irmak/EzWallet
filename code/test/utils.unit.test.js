import { handleDateFilterParams, verifyAuth, handleAmountFilterParams } from '../controllers/utils';
import dotenv from 'dotenv';

describe("handleDateFilterParams", () => { 

    it('should handle date parameter only', () => {
        const req = { query: { date: '2023-05-01' } };
        const expectedFilter = {
        date: {
            $gte: new Date('2023-05-01T00:00:00.000Z'),
            $lte: new Date('2023-05-01T23:59:59.999Z'),
        },
    };

    const filter = handleDateFilterParams(req);

    expect(filter).toEqual(expectedFilter);
    });

    it('should throw an error if date is specified with from', () => {
        const req = { query: { date: '2023-05-01', from: '2023-04-30' } };

        expect(() => {
            handleDateFilterParams(req);
        }).toThrow('Cannot specify "date" together with "from" or "upTo"');
    });

    it('should throw an error if date is specified with upTo', () => {
        const req = { query: { date: '2023-05-01', upTo: '2023-05-02' } };

        expect(() => {
            handleDateFilterParams(req);
        }).toThrow('Cannot specify "date" together with "from" or "upTo"');
    });

    it('should handle from parameter only', () => {
        const req = { query: { from: '2023-04-30' } };
        const expectedFilter = {
            date: {
                $gte: new Date('2023-04-30T00:00:00.000Z'),
            },
        };

        const filter = handleDateFilterParams(req);

        expect(filter).toEqual(expectedFilter);
    });

    it('should handle upTo parameter only', () => {
        const req = { query: { upTo: '2023-05-02' } };
        const expectedFilter = {
            date: {
                $lte: new Date('2023-05-02T23:59:59.999Z'),
            },
        };

        const filter = handleDateFilterParams(req);

        expect(filter).toEqual(expectedFilter);
    });

    it('should handle from and upTo parameters', () => {
        const req = { query: { from: '2023-04-30', upTo: '2023-05-02' } };
        const expectedFilter = {
            date: {
                $gte: new Date('2023-04-30T00:00:00.000Z'),
                $lte: new Date('2023-05-02T23:59:59.999Z'),
            },
        };
    
        const filter = handleDateFilterParams(req);
    
        expect(filter).toEqual(expectedFilter);
    });

    it('should handle no date parameters', () => {
        const req = { query: {} };
        const expectedFilter = {};

        const filter = handleDateFilterParams(req);

        expect(filter).toEqual(expectedFilter);
    });

})

describe("handleAmountFilterParams", () => { 
    it('should handle min and max parameters', () => {
        const req = { query: { min: '50', max: '200' } };
        const expectedFilter = {
            amount: {
                $gte: 50,
                $lte: 200,
            },
        };
    
        const filter = handleAmountFilterParams(req);
    
        expect(filter).toEqual(expectedFilter);
    });
    
    it('should handle min parameter', () => {
        const req = { query: { min: '100' } };
        const expectedFilter = {
            amount: {
                $gte: 100,
            },
        };
    
        const filter = handleAmountFilterParams(req);
    
        expect(filter).toEqual(expectedFilter);
    });
    
    it('should handle max parameter', () => {
        const req = { query: { max: '500' } };
        const expectedFilter = {
            amount: {
                $lte: 500,
            },
        };
    
        const filter = handleAmountFilterParams(req);
    
        expect(filter).toEqual(expectedFilter);
    });
    
    it('should handle no parameters', () => {
        const req = { query: {} };
        const expectedFilter = {};
    
        const filter = handleAmountFilterParams(req);
    
        expect(filter).toEqual(expectedFilter);
    });
})

describe("verifyAuth", () => { 

    dotenv.config();
    const jwt = require('jsonwebtoken');

    // Mocked data for testing
    const accessToken = jwt.sign({ username: 'john', email: 'john@example.com', role: 'User' }, process.env.ACCESS_KEY);
    const refreshToken = jwt.sign({ username: 'john', email: 'john@example.com', role: 'User' }, process.env.ACCESS_KEY, { expiresIn: '7d' });

    it('should return false for missing tokens', () => {
        const req = { cookies: {} };
        const info = { authType: 'User', username: 'john' };
    
        const result = verifyAuth(req, {}, info);
    
        expect(result.authorized).toBe(false);
        expect(result.cause).toBe('Unauthorized');
    });

    it('should return false for missing username in accessToken', () => {
        const faultyAccessToken = jwt.sign({ username: '', email: 'john@example.com', role: 'User' }, process.env.ACCESS_KEY);

        const req = { cookies: {accessToken: faultyAccessToken, refreshToken: refreshToken} };
        const info = { authType: 'User', username: 'john' };
        
        const result = verifyAuth(req, {}, info);
    
        expect(result.authorized).toBe(false);
        expect(result.cause).toBe('Token is missing information');
    });

    it('should return false for missing email in accessToken', () => {
        const faultyAccessToken = jwt.sign({ username: 'john', email: '', role: 'User' }, process.env.ACCESS_KEY);

        const req = { cookies: {accessToken: faultyAccessToken, refreshToken: refreshToken} };
        const info = { authType: 'User', username: 'john' };
        
        const result = verifyAuth(req, {}, info);
    
        expect(result.authorized).toBe(false);
        expect(result.cause).toBe('Token is missing information');
    });

    it('should return false for missing role in accessToken', () => {
        const faultyAccessToken = jwt.sign({ username: 'john', email: 'john@example.com', role: '' }, process.env.ACCESS_KEY);

        const req = { cookies: {accessToken: faultyAccessToken, refreshToken: refreshToken} };
        const info = { authType: 'User', username: 'john' };
        
        const result = verifyAuth(req, {}, info);
    
        expect(result.authorized).toBe(false);
        expect(result.cause).toBe('Token is missing information');
    });

    it('should return false for missing username in refreshToken', () => {
        const faultyRefreshToken = jwt.sign({ username: '', email: 'john@example.com', role: 'User' }, process.env.ACCESS_KEY);

        const req = { cookies: {accessToken: accessToken, refreshToken: faultyRefreshToken} };
        const info = { authType: 'User', username: 'john' };
        
        const result = verifyAuth(req, {}, info);
    
        expect(result.authorized).toBe(false);
        expect(result.cause).toBe('Token is missing information');
    });

    it('should return false for missing email in refreshToken', () => {
        const faultyRefreshToken = jwt.sign({ username: 'john', email: '', role: 'User' }, process.env.ACCESS_KEY);

        const req = { cookies: {accessToken: accessToken, refreshToken: faultyRefreshToken} };
        const info = { authType: 'User', username: 'john' };
        
        const result = verifyAuth(req, {}, info);
    
        expect(result.authorized).toBe(false);
        expect(result.cause).toBe('Token is missing information');
    });

    it('should return false for missing role in refreshToken', () => {
        const faultyRefreshToken = jwt.sign({ username: 'john', email: 'john@example.com', role: '' }, process.env.ACCESS_KEY);

        const req = { cookies: {accessToken: accessToken, refreshToken: faultyRefreshToken} };
        const info = { authType: 'User', username: 'john' };
        
        const result = verifyAuth(req, {}, info);
    
        expect(result.authorized).toBe(false);
        expect(result.cause).toBe('Token is missing information');
    });

    it('should return false for mismatched username in simple authType', () => {
        const accessTokenWithWrongRole = jwt.sign({ username: 'john', email: 'john@example.com', role: 'Regular' }, process.env.ACCESS_KEY);
        const refreshTokenWithWrongRole = jwt.sign({ username: 'stephen', email: 'stephen@example.com', role: 'Admin' }, process.env.ACCESS_KEY, { expiresIn: '7d' });
        const req = { cookies: { accessToken: accessTokenWithWrongRole, refreshToken: refreshTokenWithWrongRole } };
        const info = { authType: '' };
    
        const result = verifyAuth(req, {}, info);
    
        expect(result.authorized).toBe(false);
        expect(result.cause).toBe('Mismatched users');
    });

    it('should return false for mismatched email in simple authType', () => {
        const accessTokenWithWrongRole = jwt.sign({ username: 'john', email: 'john@example.com', role: 'Regular' }, process.env.ACCESS_KEY);
        const refreshTokenWithWrongRole = jwt.sign({ username: 'john', email: 'stephen@example.com', role: 'Admin' }, process.env.ACCESS_KEY, { expiresIn: '7d' });
        const req = { cookies: { accessToken: accessTokenWithWrongRole, refreshToken: refreshTokenWithWrongRole } };
        const info = { authType: '' };
    
        const result = verifyAuth(req, {}, info);
    
        expect(result.authorized).toBe(false);
        expect(result.cause).toBe('Mismatched users');
    });

    it('should return false for mismatched role in simple authType', () => {
        const accessTokenWithWrongRole = jwt.sign({ username: 'john', email: 'john@example.com', role: 'Regular' }, process.env.ACCESS_KEY);
        const refreshTokenWithWrongRole = jwt.sign({ username: 'john', email: 'john@example.com', role: 'Admin' }, process.env.ACCESS_KEY, { expiresIn: '7d' });
        const req = { cookies: { accessToken: accessTokenWithWrongRole, refreshToken: refreshTokenWithWrongRole } };
        const info = { authType: '' };
    
        const result = verifyAuth(req, {}, info);
    
        expect(result.authorized).toBe(false);
        expect(result.cause).toBe('Mismatched users');
    });

    it('should return false for mismatched role in accessToken in Admin authType', () => {
        const accessTokenWithWrongRole = jwt.sign({ username: 'john', email: 'john@example.com', role: 'Regular' }, process.env.ACCESS_KEY);
        const refreshTokenWithWrongRole = jwt.sign({ username: 'john', email: 'john@example.com', role: 'Regular' }, process.env.ACCESS_KEY, { expiresIn: '7d' });
        const req = { cookies: { accessToken: accessTokenWithWrongRole, refreshToken: refreshTokenWithWrongRole } };
        const info = { authType: 'Admin' };
    
        const result = verifyAuth(req, {}, info);
    
        expect(result.authorized).toBe(false);
        expect(result.cause).toBe('Mismatched role');
    });

    it('should return false for mismatched role in refreshToken in Admin authType', () => {
        const accessToken = jwt.sign({ username: 'john', email: 'john@example.com', role: 'Regular' }, process.env.ACCESS_KEY);
        const refreshTokenWithWrongRole = jwt.sign({ username: 'john', email: 'john@example.com', role: 'Regular' }, process.env.ACCESS_KEY, { expiresIn: '7d' });
        const req = { cookies: { accessToken: accessToken, refreshToken: refreshTokenWithWrongRole } };
        const info = { authType: 'Admin' };
    
        const result = verifyAuth(req, {}, info);
    
        expect(result.authorized).toBe(false);
        expect(result.cause).toBe('Mismatched role');
    });

    it('should return false for mismatched role in accessToken in User authType', () => {
        const accessTokenWithWrongRole = jwt.sign({ username: 'john', email: 'john@example.com', role: 'Regular' }, process.env.ACCESS_KEY);
        const refreshTokenWithWrongRole = jwt.sign({ username: 'john', email: 'john@example.com', role: 'Regular' }, process.env.ACCESS_KEY, { expiresIn: '7d' });
        const req = { cookies: { accessToken: accessTokenWithWrongRole, refreshToken: refreshTokenWithWrongRole } };
        const info = { authType: 'User' };
    
        const result = verifyAuth(req, {}, info);
    
        expect(result.authorized).toBe(false);
        expect(result.cause).toBe('Mismatched username');
    });

    it('should return false for mismatched role in refreshToken in User authType', () => {
        const accessToken = jwt.sign({ username: 'john', email: 'john@example.com', role: 'Regular' }, process.env.ACCESS_KEY);
        const refreshTokenWithWrongRole = jwt.sign({ username: 'john', email: 'john@example.com', role: 'Regular' }, process.env.ACCESS_KEY, { expiresIn: '7d' });
        const req = { cookies: { accessToken: accessToken, refreshToken: refreshTokenWithWrongRole } };
        const info = { authType: 'User' };
    
        const result = verifyAuth(req, {}, info);
    
        expect(result.authorized).toBe(false);
        expect(result.cause).toBe('Mismatched username');
    });

    it('should return false for mismatched email in Group authType', () => {
        const req = { cookies: { accessToken, refreshToken } };
        const info = { authType: 'Group', emails: ['jane@example.com', 'mark@example.com'] };
    
        const result = verifyAuth(req, {}, info);
    
        expect(result.authorized).toBe(false);
        expect(result.cause).toBe('User is not a group member');
    });

    it('should return true for matching user in User authType', () => {
        const accessToken = jwt.sign({ username: 'john', email: 'john@example.com', role: 'User' }, process.env.ACCESS_KEY);
        const refreshToken = jwt.sign({ username: 'john', email: 'john@example.com', role: 'User' }, process.env.ACCESS_KEY, { expiresIn: '7d' });

        const req = { cookies: { accessToken: accessToken, refreshToken: refreshToken } };
        const info = { authType: 'User', username: 'john' };
    
        const result = verifyAuth(req, {}, info);
    
        expect(result.authorized).toBe(true);
        expect(result.cause).toBe('Authorized');
    });

    it('should return true for matching role in Admin authType', () => {
        const accessToken = jwt.sign({ username: 'john', email: 'john@example.com', role: 'Admin' }, process.env.ACCESS_KEY);
        const refreshToken = jwt.sign({ username: 'john', email: 'john@example.com', role: 'Admin' }, process.env.ACCESS_KEY, { expiresIn: '7d' });

        const req = { cookies: { accessToken: accessToken, refreshToken: refreshToken } };
        const info = { authType: 'Admin' };
    
        const result = verifyAuth(req, {}, info);
    
        expect(result.authorized).toBe(true);
        expect(result.cause).toBe('Authorized');
    });

    it('should return true for matching email in Group authType', () => {
        const req = { cookies: { accessToken, refreshToken } };
        const info = { authType: 'Group', emails: ['john@example.com', 'jane@example.com'] };
    
        const result = verifyAuth(req, {}, info);
    
        expect(result.authorized).toBe(true);
        expect(result.cause).toBe('Authorized');
    });

    it('should return true and refresh access token if expired', () => {
        const expiredAccessToken = jwt.sign({ username: 'john', email: 'john@example.com', role: 'User' }, process.env.ACCESS_KEY, { expiresIn: '0s' });
        const req = { cookies: { accessToken: expiredAccessToken, refreshToken: refreshToken } };
        const mockRes = {
            cookie: jest.fn(),
            locals: {
                refreshedTokenMessage: 'Access token has been refreshed. Remember to copy the new one in the headers of subsequent calls',
            }
        };
        const info = { authType: 'User', username: 'john' };
    
        const result = verifyAuth(req, mockRes, info);

        expect(result.cause).toBe('Authorized');    
        expect(result.authorized).toBe(true);
        expect(mockRes.cookie).toHaveBeenCalledTimes(1);
        expect(mockRes.cookie).toHaveBeenCalledWith('accessToken', expect.any(String), expect.any(Object));
    });

    it('should return false and Perform login again if both tokens are expired', () => {
        const expiredAccessToken = jwt.sign({ username: 'john', email: 'john@example.com', role: 'User' }, process.env.ACCESS_KEY, { expiresIn: '0s' });
        const expiredRefreshToken = jwt.sign({ username: 'john', email: 'john@example.com', role: 'User' }, process.env.ACCESS_KEY, { expiresIn: '0s' });
        const req = { cookies: { accessToken: expiredAccessToken, refreshToken: expiredRefreshToken } };
        const info = { authType: 'User', username: 'john' };
    
        const result = verifyAuth(req, {}, info);
    
        expect(result.authorized).toBe(false);
        expect(result.cause).toBe('Perform login again');
    });

    it('should return false and error message if both tokens are expired and cannot refresh', () => {
        const expiredAccessToken = jwt.sign({ username: 'john', email: 'john@example.com', role: 'User' }, process.env.ACCESS_KEY, { expiresIn: '0s' });
        const expiredRefreshToken = jwt.sign({ username: 'john', email: 'john@example.com', role: 'User' }, process.env.ACCESS_KEY, { expiresIn: '0s' });
        const req = { cookies: { accessToken: expiredAccessToken, refreshToken: expiredRefreshToken } };
        const res = {
            cookie: jest.fn(),
            locals: {},
        };
        const info = { authType: 'User', username: 'john' };
        const errorMessage = 'Access token refresh error';

        jest.spyOn(jwt, 'verify').mockImplementationOnce(() => {
            throw new jwt.TokenExpiredError('Token expired', new Date());
        });
          // Simulate another error during access token refresh
        jest.spyOn(jwt, 'verify').mockImplementationOnce(() => {
            throw new Error(errorMessage);
        });

        const result = verifyAuth(req, res, info);
        expect(result.authorized).toBe(false);
        expect(res.cookie).not.toHaveBeenCalled();
        expect(res.locals.refreshedTokenMessage).toBeUndefined();
        expect(result.cause).toBe('Error');
    });

    it('should return false and error message if there is a general error', () => {
        const expiredAccessToken = jwt.sign({ username: 'john', email: 'john@example.com', role: 'User' }, 'foo', { expiresIn: '0s' });
        const expiredRefreshToken = jwt.sign({ username: 'john', email: 'john@example.com', role: 'User' }, process.env.ACCESS_KEY, { expiresIn: '0s' });
        const req = { cookies: { accessToken: expiredAccessToken, refreshToken: expiredRefreshToken } };
        const info = { authType: 'User', username: 'john' };
        const errorMessage = 'JsonWebTokenError'


        const result = verifyAuth(req, {}, info);
    
        expect(result.authorized).toBe(false);
        expect(result.cause).toBe(errorMessage);
    });
})
