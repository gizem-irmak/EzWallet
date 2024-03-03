import { Group, User } from '../models/User';
import { verifyAuth } from '../controllers/utils';
import jwt from 'jsonwebtoken';
import { getUsers, getUser, createGroup, getGroups, getGroup, addToGroup, removeFromGroup, deleteUser, deleteGroup, } from '../controllers/users';
import { transactions } from '../models/model';

jest.mock('jsonwebtoken');
jest.mock('../models/User');
jest.mock('../controllers/utils');
jest.mock('../controllers/controller.service');


const resetAllMocks = () => {
  const method = 'mockRestore' // 'mockRestore' | 'mockReset' | 'mockClear';

  User.findOne[method]();
  User.find[method]();
  User[method]();
  Group.findOne[method]();
  Group.find[method]();
  Group[method]();
  Group.prototype.save[method]();
  verifyAuth[method]();
}

beforeEach(() => {
  User.find.mockClear();
  User.findOne.mockClear();
  User.prototype.save.mockClear();
  Group.create.mockClear();
  Group.findOne.mockClear();
  Group.prototype.save.mockClear();
  jest.clearAllMocks();
});


afterEach(() => {
  jest.clearAllMocks();
});



describe("getUsers", () => {

   beforeEach(resetAllMocks);
    const mockReq = {};
    const mockRes = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
    locals: {
    refreshedTokenMessage: "Refreshed token message"

    }
   };

   const mockUsersData = [
    {
      username: "Mario",
      email: "mario.red@email.com",
      role: "user"
    },
    {
      username: "Luigi",
      email: "luigi.red@email.com",
      role: "user"
    },
    {
      username: "admin",
      email: "admin@email.com",
      role: "admin"
    }
  ];

   it("should return an array of users if called by an authenticated admin user", async () => {

     verifyAuth.mockImplementationOnce(() => ({ authorized: true, authType: "admin" }));
    
     User.find.mockReturnValueOnce(mockUsersData);
    
     await getUsers(mockReq, mockRes);
    
     expect(User.find).toHaveBeenCalled();
     expect(mockRes.json).toHaveBeenCalledWith({
      
     data: [
        { username: "Mario", email: "mario.red@email.com", role: "user" },
        { username: "Luigi", email: "luigi.red@email.com", role: "user" },
        { username: "admin", email: "admin@email.com", role: "admin" }
      ],
     message: "Refreshed token message"

     });

   });


   it("should return a 401 error if called by an authenticated user who is not an admin", async () => {

     verifyAuth.mockImplementationOnce(() => ({ authorized: false, authType: "User", cause: "Unauthorized access" }));
  
     await getUsers(mockReq, mockRes);
  
     expect(User.find).not.toHaveBeenCalled();
     expect(mockRes.status).toHaveBeenCalledWith(401);
     expect(mockRes.json).toHaveBeenCalledWith({ error: "Unauthorized access" });

   });

  
   it("should return a 500 error if there is an internal server error", async () => {

     verifyAuth.mockImplementationOnce(() => ({ authorized: true, authType: "Admin" }));

     User.find.mockRejectedValue(new Error("Internal server error"));

     await getUsers(mockReq, mockRes);
     expect(User.find).toHaveBeenCalled();
     expect(mockRes.status).toHaveBeenCalledWith(500);
     expect(mockRes.json).toHaveBeenCalledWith({ error: "Internal server error" });

   });


});



describe("getUser", () => {

   beforeEach(resetAllMocks);

   const mockUsername = "Mario";
   const mockReq = {
    params: { username: mockUsername },
   };
   const mockRes = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
    locals: {},
   };
   const mockUser = {
    username: "Mario",
    email: "mario.red@email.com",
    role: "Regular",
   };


   it("should return the user data if called by the same user as the one in the route parameter", async () => {

     verifyAuth.mockImplementationOnce(() => ({ authorized: true, authType: "User" }));
     User.findOne.mockReturnValueOnce(mockUser);
     mockRes.locals.refreshedTokenMessage = "Refreshed token message"; 

     await getUser(mockReq, mockRes);
     expect(User.findOne).toHaveBeenCalledWith({ username: mockUsername });
     expect(mockRes.json).toHaveBeenCalledWith({
      data: mockUser,
      message: "Refreshed token message",

     });

   });


   it("should return the user data if called by an authenticated admin user", async () => {

     verifyAuth.mockImplementationOnce(() => ({ authorized: false, authType: "User" })); 
     verifyAuth.mockImplementationOnce(() => ({ authorized: true, authType: "Admin" }));

     User.findOne.mockReturnValueOnce(mockUser);

     await getUser(mockReq, mockRes);
     expect(User.findOne).toHaveBeenCalledWith({ username: mockUsername });
     expect(mockRes.json).toHaveBeenCalledWith({
      data: mockUser,
      message: "Refreshed token message",
     });

   });


   it("should return a 400 error if the username does not represent a user in the database", async () => {

     verifyAuth.mockImplementationOnce(() => ({ authorized: true, authType: "User" }));

     User.findOne.mockReturnValueOnce(null);

     await getUser(mockReq, mockRes);
     expect(User.findOne).toHaveBeenCalledWith({ username: mockUsername });
     expect(mockRes.status).toHaveBeenCalledWith(400);
     expect(mockRes.json).toHaveBeenCalledWith({ error: "User not found" });

   });


   it("should return a 401 error if called by an authenticated user who is neither the same user as the one in the route parameter nor an admin", async () => {
    
     const authErrorMsg = "Unauthorized access";

     mockRes.locals.message = authErrorMsg;
     verifyAuth
      .mockImplementationOnce(() => ({ authorized: false, authType: "User", cause: authErrorMsg }))
      .mockImplementationOnce(() => ({ authorized: false, authType: "User", cause: authErrorMsg }));
  
     await getUser(mockReq, mockRes);
  
     expect(verifyAuth).toHaveBeenCalledTimes(2);
     expect(User.findOne).not.toHaveBeenCalled();
     expect(mockRes.status).toHaveBeenCalledWith(401);
     expect(mockRes.json).toHaveBeenCalledWith({ error: authErrorMsg });

   });
  

   it("should return a 500 error if there is an internal server error", async () => {

     const errorMessage = "Internal server error";

     mockRes.locals.message = errorMessage;
     verifyAuth.mockImplementationOnce(() => ({ authorized: true, authType: "User" }));
     User.findOne.mockRejectedValueOnce(new Error(errorMessage));

     await getUser(mockReq, mockRes);
     expect(User.findOne).toHaveBeenCalledWith({ username: mockUsername });
     expect(mockRes.status).toHaveBeenCalledWith(500);
     expect(mockRes.json).toHaveBeenCalledWith({ error: errorMessage });
   });


});



describe("createGroup", () => {

   beforeEach(resetAllMocks);

   const req = {
    cookies:{accessToken:'test'},
    body: {
      name: 'Group 1',
      memberEmails: ['user1@example.com', 'user2@example.com'],
    },
   };
   const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
    locals: {
      refreshedTokenMessage: 'Refreshed token successfully.',
    },
   };

   afterEach(() => {
    jest.clearAllMocks();
   });


   it("should return a 401 error if called by a user who is not authenticated", async () => {

     verifyAuth.mockReturnValueOnce({ authorized: false, authType: "Simple", cause: "Unauthorized access" });

     await createGroup(req, res);
     expect(verifyAuth).toHaveBeenCalledWith(req, res, { authType: "Simple" });
     expect(res.status).toHaveBeenCalledWith(401);
     expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized access" });

   });


   it("should return a 400 error if the request body does not contain all the necessary attributes", async () => {

     verifyAuth.mockReturnValueOnce({ authorized: true, authType: "Simple" });

     req.body = {};

     await createGroup(req, res);
     expect(res.status).toHaveBeenCalledWith(400);
     expect(res.json).toHaveBeenCalledWith({ error: "request body does not contain all the necessary attributes" });

   });


   it("should return a 400 error if the group name passed in the request body is an empty string", async () => {

     verifyAuth.mockReturnValueOnce({ authorized: true, authType: "Simple" });

     req.body = {
      name: '',
      memberEmails: ['user1@example.com', 'user2@example.com'],
     },

     await createGroup(req, res);
     expect(res.status).toHaveBeenCalledWith(400);
     expect(res.json).toHaveBeenCalledWith({ error: "the group name passed in the request body is an empty string" });

   });


   it("should return a 400 error if the group name passed in the request body represents an already existing group in the database", async () => {
     
    verifyAuth.mockReturnValueOnce({ authorized: true, authType: "Simple" });

     const groupName = "Existing Group";
     req.body = { name: groupName, memberEmails: ["member1@example.com"] };
     Group.findOne.mockReturnValueOnce({ name: groupName });

     await createGroup(req, res);
     expect(Group.findOne).toHaveBeenCalledWith({ name: groupName });
     expect(res.status).toHaveBeenCalledWith(400);
     expect(res.json).toHaveBeenCalledWith({ error: "Group name already used" });

   });

 
   it('should return 400 if user calling is already in a group', async () => {

     verifyAuth.mockReturnValueOnce({ authorized: true, authType: "Simple" });

     req.body = { name: "newgroup", memberEmails: ["xxx@example.com"] };
     jwt.verify.mockReturnValueOnce({username: "pepito"});

     Group.findOne.mockReturnValueOnce(null)
     User.findOne.mockReturnValueOnce({
      name: "giacomo",
      _id: "123",
      email: "ccc@example.com",
     });
     Group.findOne.mockReturnValueOnce({name:"g1"});

     await createGroup(req, res);
     expect(res.status).toHaveBeenCalledWith(400);
     expect(res.json).toHaveBeenCalledWith({error: "User calling already in a group"});

   });


   it('should return 400 if one or more emails are empty strings', async () => {

     verifyAuth.mockReturnValueOnce({ authorized: true, authType: "Simple" });

     req.body = { name: "newgroup", memberEmails: [""] };
     jwt.verify.mockReturnValueOnce({username: "usercalling"});

     Group.findOne.mockReturnValueOnce(null)
     User.findOne.mockReturnValueOnce({
      name: "usercalling",
      _id: "123",
      email: "usercalling@example.com",
     });
     Group.findOne.mockReturnValueOnce(null);

     await createGroup(req, res);
     expect(res.status).toHaveBeenCalledWith(400);
     expect(res.json).toHaveBeenCalledWith({error: "one or more emails are empty strings"});

   });


   it('should return 400 if not all emails have the right format', async () => {

     verifyAuth.mockReturnValueOnce({ authorized: true, authType: "Simple" });

     req.body = { name: "newgroup", memberEmails: ["invalid-format"] };
     jwt.verify.mockReturnValueOnce({username: "usercalling"});

     Group.findOne.mockReturnValueOnce(null)
     User.findOne.mockReturnValueOnce({
      name: "usercalling",
      _id: "123",
      email: "usercalling@example.com",
     });
     Group.findOne.mockReturnValueOnce(null);

     await createGroup(req, res);
     expect(res.status).toHaveBeenCalledWith(400);
     expect(res.json).toHaveBeenCalledWith({error: "not all emails have the right format"});

   });


  it("should return a 400 error if all the provided emails represent users that are already in a group or do not exist in the database", async () => {
     
    verifyAuth.mockReturnValueOnce({ authorized: true, authType: "Simple" });
  
     req.body = { name: "newgroup", memberEmails: ["usercalling@example.com"]};
     jwt.verify.mockReturnValueOnce({ username: "usercalling" });
    
     Group.findOne.mockReturnValueOnce(null);
     User.findOne.mockReturnValueOnce({
      name: "usercalling",
      _id: "123",
      email: "usercalling@example.com",
     });

     Group.findOne.mockReturnValueOnce(null);

     User.findOne.mockReturnValueOnce({
      name: "usercalling",
      _id: "123",
      email: "usercalling@example.com",
     });
     Group.findOne.mockReturnValueOnce(null);

     await createGroup(req, res);
     expect(res.status).toHaveBeenCalledWith(400);
     expect(res.json).toHaveBeenCalledWith({ error: "all the `memberEmails` either do not exist or are already in a group" });

  });
  

  it("should create a new group and return the group data, already in group members, and members not found", async () => {
     
    verifyAuth.mockReturnValueOnce({ authorized: true, authType: "Simple" });
  
     req.body = { name: "newgroup", memberEmails: ["alreadyingroup@example.com","membernotfound@example.com", "realmember@example.com",] };
  
     jwt.verify.mockReturnValueOnce({ username: "usercalling" });
    
     Group.findOne.mockReturnValueOnce(null);
     User.findOne.mockReturnValueOnce({name: "usercalling", _id: "123", email: "usercalling@example.com"});
     Group.findOne.mockReturnValueOnce(null);

     //for 1
     User.findOne.mockReturnValueOnce({name: "alreadyingroup", _id: "124", email: "alreadyingroup@example.com"});
     Group.findOne.mockReturnValueOnce({name : "g3"});

     //for 2
     User.findOne.mockReturnValueOnce(null);

     //for 3
     User.findOne.mockReturnValueOnce({name: "realmember", _id: "126", email: "realmember@example.com"});
     Group.findOne.mockReturnValueOnce(null);

     //for 4
     User.findOne.mockReturnValueOnce({name: "usercalling", _id: "123",email: "usercalling@example.com"});
     Group.findOne.mockReturnValueOnce(null);

     Group.create.mockReturnValueOnce({ name : "newgroup" , 
     members : [{email : "realmember@example.com" , user : "126"}, {email : "usercalling@example.com" , user : "123"}]});

     await createGroup(req, res);
     expect(res.status).toHaveBeenCalledWith(200);
     expect(res.json).toHaveBeenCalledWith({
      "data": {
        "alreadyInGroup": ["alreadyingroup@example.com"],
        "group": {
          "members": [
            { "email": "realmember@example.com" },
            { "email": "usercalling@example.com" }
          ],
          "name": "newgroup"
        },
        "membersNotFound": ["membernotfound@example.com"]
      },
      "message": "Refreshed token successfully."
    });
  
  });
    


   it("should return a 500 error if there is an internal server error", async () => {

    verifyAuth.mockImplementationOnce(() => ({ authorized: true, authType: "Simple" }));
    Group.findOne.mockRejectedValue(new Error("Internal server error"));

    await createGroup(req, res);
    expect(Group.findOne).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Internal server error" });

   });

});



describe('getGroups', () => {

   let req;
   let res;

   beforeEach(() => {
     req = {};
     res = {
      status: jest.fn(() => res),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: 'Token refreshed.',
       },
     };
   });

   afterEach(() => {
    jest.clearAllMocks();
   });


   it('should return groups if admin authentication is successful', async () => {
    
     verifyAuth.mockReturnValueOnce({ authorized: true, authType: "Admin" });

     Group.find.mockReturnValueOnce([
      {
        name: 'Group 1',
        members: [{ email: 'member1@example.com' }, { email: 'member2@example.com' }],
      },
      {
        name: 'Group 2',
        members: [{ email: 'member3@example.com' }, { email: 'member4@example.com' }],
      },
     ]);

     await getGroups(req, res);
     expect(res.status).toHaveBeenCalledWith(200);
     expect(res.json).toHaveBeenCalledWith({
       data: [
        {
          name: 'Group 1',
          members: [{'email':'member1@example.com'} , {'email':'member2@example.com'}],
        },
        {
          name: 'Group 2',
          members: [{'email':'member3@example.com'}, {'email':'member4@example.com'}],
        },
       ],
       message: 'Token refreshed.',
     });

   });


   it('should return an error if admin authentication fails', async () => {
    
     verifyAuth.mockReturnValueOnce({ authorized: false, cause: 'Admin authentication failed' });
    
     await getGroups(req, res);
     expect(res.status).toHaveBeenCalledWith(401);
     expect(res.json).toHaveBeenCalledWith({ error: 'Admin authentication failed' });

   });


   it('should return a server error if an exception is thrown', async () => {

     verifyAuth.mockImplementationOnce(() => ({ authorized: true, authType: "Admin" }));
     Group.find.mockRejectedValue(new Error("Internal server error"));

     await getGroups(req, res);
     expect(Group.find).toHaveBeenCalled();
     expect(res.status).toHaveBeenCalledWith(500);
     expect(res.json).toHaveBeenCalledWith({ error: "Internal server error" });

   });


});



describe('getGroup', () => {

   let req;
   let res;

   beforeEach(() => {
    req = {
      params: {
        name: 'Group 1',
      },
    };
    res = {
      status: jest.fn(() => res),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: 'Token refreshed.',
      },
    };
   });

   afterEach(() => {
    jest.clearAllMocks();
   });


   it('should return the group if the user is authorized (in the group)', async () => {
     
     verifyAuth.mockImplementationOnce(() => ({ authorized: true, authType: "Group" }));

     Group.findOne.mockReturnValueOnce({
      name: 'Group 1',
      members: [{ email: 'member1@example.com' }, { email: 'member2@example.com' }],
     });

     await getGroup(req, res);
     expect(Group.findOne).toHaveBeenCalledWith({ name: 'Group 1' });
     expect(verifyAuth).toHaveBeenCalledWith(req, res, { authType: 'Group', emails: ['member1@example.com', 'member2@example.com'] });
     expect(res.status).toHaveBeenCalledWith(200);
     expect(res.json).toHaveBeenCalledWith({
      data: {
        name: 'Group 1',
        members: [{'email':'member1@example.com'}, {'email':'member2@example.com'}],
      },
      message: 'Token refreshed.',
     });

   });


   it('should return the group if the admin is authorized', async () => {
     
     verifyAuth.mockImplementationOnce(() => ({ authorized: false, authType: "Group" }));
     verifyAuth.mockImplementationOnce(() => ({ authorized: true, authType: "Admin" }));
 
     Group.findOne.mockReturnValueOnce({
      name: 'Group 1',
      members: [{ email: 'member1@example.com' }, { email: 'member2@example.com' }],
     });

     await getGroup(req, res);
     expect(Group.findOne).toHaveBeenCalledWith({ name: 'Group 1' });
     expect(verifyAuth).toHaveBeenCalledWith(req, res, { authType: 'Group', emails: ['member1@example.com', 'member2@example.com'] });
     expect(verifyAuth).toHaveBeenCalledWith(req, res, { authType: 'Admin' });
     expect(res.status).toHaveBeenCalledWith(200);
     expect(res.json).toHaveBeenCalledWith({
      data: {
        name: 'Group 1',
        members: [{'email':'member1@example.com'}, {'email':'member2@example.com'}],
      },
      message: 'Token refreshed.',
     });

     });


   it('should return an error if the group does not exist', async () => {
     
     Group.findOne.mockReturnValueOnce(null);

     await getGroup(req, res);
     expect(Group.findOne).toHaveBeenCalledWith({ name: 'Group 1' });
     expect(res.status).toHaveBeenCalledWith(400);
     expect(res.json).toHaveBeenCalledWith({ error: 'Group does not exist' });

   });


   it('should return a 401 error if the user is neither part of the group nor an admin', async () => {

     verifyAuth.mockImplementationOnce(() => ({ authorized: false, authType: "Group" }));
     verifyAuth.mockImplementationOnce(() => ({ authorized: false, authType: "Admin" }));

     Group.findOne.mockReturnValueOnce({
      name: 'Group 1',
      members: [{ email: 'member1@example.com' }, { email: 'member2@example.com' }],
     });

     await getGroup(req, res);
     expect(res.status).toHaveBeenCalledWith(401);

    });


   it('should return a server error if an exception is thrown', async () => {

     verifyAuth.mockImplementationOnce(() => ({ authorized: false, authType: "Group" }));
     verifyAuth.mockImplementationOnce(() => ({ authorized: true, authType: "Admin" }));
     Group.findOne.mockRejectedValue(new Error("Internal server error"));

     await getGroup(req, res);
     expect(Group.findOne).toHaveBeenCalled();
     expect(res.status).toHaveBeenCalledWith(500);
     expect(res.json).toHaveBeenCalledWith({ error: "Internal server error" });

   }); 


});



describe('addToGroup', () => {

   beforeEach(resetAllMocks);
   let req;
   let res;

   beforeEach(() => {

    req = {
    params: {
    name: 'newgroup',
    },
    body: {
    emails: ['user1@example.com', 'user2@example.com'],
    },
    url: '/some/path/insert',
    };


    res = {
      status: jest.fn(() => res),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: 'Token refreshed.',
      },
    };

   });

   afterEach(() => {
    jest.clearAllMocks();
   });


   test('should return 400 if group does not exist', async () => {

     req = {params: { name: 'Family'}, body: { emails: ['user1@example.com', 'user2@example.com'] }, url: '/some/path/insert'};

     verifyAuth.mockImplementationOnce(() => ({ authorized: true, authType: "Group" }));
     verifyAuth.mockImplementationOnce(() => ({ authorized: true, authType: "Admin" }));
     Group.findOne.mockReturnValueOnce(null)

     await addToGroup(req, res);
     expect(res.status).toHaveBeenCalledWith(400);
     expect(res.json).toHaveBeenCalledWith({ error: 'Group does not exist' });

   });


   test('should return 401 error if called by an authenticated user who is not an admin', async () => {

     req = {params: { name: 'Family'}, body: { emails: ['user1@example.com', 'user2@example.com'] }, url: 'api/groups/Family/insert'};

     verifyAuth.mockImplementationOnce(() => ({ authorized: false, authType: "Admin" }));

     Group.findOne.mockReturnValueOnce({
      name: 'Group 1',
      members: [{ email: 'member1@example.com' }, { email: 'member2@example.com' }],
     });

     await addToGroup(req, res);
     expect(res.status).toHaveBeenCalledWith(401);
     expect(res.json).toHaveBeenCalledWith({ error: undefined });

   });


   test('should return 401 if called by an authenticated user who is not part of the group', async () => {

     req = {params: { name: 'Family'}, body: { emails: ['user1@example.com', 'user2@example.com'] }, url: 'api/groups/Family/add'};

     Group.findOne.mockReturnValueOnce({
      name: 'Group 1',
      members: [{ email: 'member1@example.com' }, { email: 'member2@example.com' }]
     });

     verifyAuth.mockImplementationOnce(() => ({ authorized: false, authType: "Group" }));

     await addToGroup(req, res);
     expect(res.status).toHaveBeenCalledWith(401);
     expect(res.json).toHaveBeenCalledWith({ error: undefined });

   });


   test('should return 400 if request body is invalid', async () => {

     verifyAuth.mockImplementationOnce(() => ({ authorized: true, authType: "Admin" }));

     Group.findOne.mockReturnValueOnce({
      name: 'Group 1',
      members: [{ email: 'member1@example.com' }, { email: 'member2@example.com' }],
     });

     req.body.emails = 'invalid emails';

     await addToGroup(req, res);
     expect(res.status).toHaveBeenCalledWith(400);
     expect(res.json).toHaveBeenCalledWith({ error: 'request body does not contain all the necessary attributes' });

   });


   test('should return 400 if one or more emails are an empty string', async () => {
    
     verifyAuth.mockImplementationOnce(() => ({ authorized: true, authType: "Admin" }));
  
     Group.findOne.mockReturnValueOnce({
      name: 'Group 1',
      members: [{ email: 'member1@example.com' }, { email: 'member2@example.com' }],
     });

     req.body.emails = ['user1@example.com', ''];

     await addToGroup(req, res);
     expect(res.status).toHaveBeenCalledWith(400);
     expect(res.json).toHaveBeenCalledWith({error: "one or more emails are an empty string"});

   });


   test('should return 400 if not all emails have the right format', async () => {
    
     verifyAuth.mockImplementationOnce(() => ({ authorized: true, authType: "Admin" }));
  
     Group.findOne.mockReturnValueOnce({
      name: 'Group 1',
      members: [{ email: 'member1@example.com' }, { email: 'member2@example.com' }],
     });

     req.body.emails = ['user1@example.com', 'invalid-format'];

     await addToGroup(req, res);
     expect(res.status).toHaveBeenCalledWith(400);
     expect(res.json).toHaveBeenCalledWith({error: "not all emails have the right format"});

     });


   test('should update the group with new members and return the updated group', async () => {

     verifyAuth.mockImplementationOnce(() => ({ authorized: true, authType: "Admin" }));

     Group.findOne.mockReturnValueOnce({
      name: "newgroup",
      members: [{ 'email': "member1@example.com" }, { 'email': "member2@example.com" }],
      save: jest.fn(),
     });

     User.findOne.mockReturnValueOnce({
      name: 'user1',
      _id: '123',
      email: 'user1@example.com',
      });

     Group.findOne.mockReturnValueOnce(null);

     User.findOne.mockReturnValueOnce({
      name: 'user2',
      _id: '124',
      email: 'user2@example.com',
      });

     Group.findOne.mockReturnValueOnce(null);

     Group.findOneAndUpdate.mockReturnValueOnce({
      name: 'newgroup',
      members: 
      [ { 'email': 'member1@example.com'}, { 'email': 'member2@example.com' },
        { 'email': 'user1@example.com'}, { 'email': 'user2@example.com' } ],     
     }
     );

     await addToGroup(req, res);
     expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
      data: {
          group: {
            name: 'newgroup',
            members: [{'email':'member1@example.com'},{'email':'member2@example.com'},{'email':'user1@example.com'}, {'email':'user2@example.com'} ],
          },
          alreadyInGroup: [],
          membersNotFound: [],
        },
        message: 'Token refreshed.'
      });

    });


   test('should handle case where all member emails are either already in group or do not exist', async () => {

     verifyAuth.mockImplementationOnce(() => ({ authorized: true, authType: "Admin" }));

     Group.findOne.mockReturnValueOnce({
      name: 'Group 1',
      members: [{ email: 'user1@example.com' }, { email: 'member2@example.com' }],
     });

     User.findOne.mockReturnValueOnce({
      name: 'user1',
      _id: '123',
      email: 'user1@example.com',
      });
    
     Group.findOne.mockReturnValueOnce({
        name: 'Group 1',
        members: [{ email: 'user1@example.com' }, { email: 'member2@example.com' }],
      });
    
     User.findOne.mockReturnValueOnce(null);

     await addToGroup(req, res);
     expect(res.status).toHaveBeenCalledWith(400);
     expect(res.json).toHaveBeenCalledWith({
      error: 'all the `emails` either do not exist or are already in a group',
     });

   });


   test('should handle server errors and return 500', async () => {

     verifyAuth.mockImplementationOnce(() => ({ authorized: true, authType: "Admin" }));
     Group.findOne.mockRejectedValue(new Error("Internal server error"));

     await addToGroup(req, res);
     expect(Group.findOne).toHaveBeenCalled();
     expect(res.status).toHaveBeenCalledWith(500);
     expect(res.json).toHaveBeenCalledWith({ error: "Internal server error" });

   });


});



describe('removeFromGroup', () => {

   beforeEach(resetAllMocks);
   let req;
   let res;

   beforeEach(() => {
    req = {
      params: {
        name: 'Group 1',
      },
      body: {
        emails: ['user1@example.com', 'user2@example.com'],
      },
      url: '/some/path/pull',
    };

    res = {
      status: jest.fn(() => res),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: 'Token refreshed.',
      },
    };
   });

   afterEach(() => {
    jest.clearAllMocks();
   });


   test('should return 400 if group does not exist', async () => {

     verifyAuth.mockImplementationOnce(() => ({ authorized: true, authType: "Admin" }));
     Group.findOne.mockReturnValueOnce(null)

     await removeFromGroup(req, res);
     expect(res.status).toHaveBeenCalledWith(400);
     expect(res.json).toHaveBeenCalledWith({ error: 'Group does not exist' });

   });

  
   test('should return 400 if group has only one member', async () => {

     verifyAuth.mockImplementationOnce(() => ({ authorized: true, authType: "Admin" }));

     Group.findOne.mockReturnValueOnce({
      name: 'Group 1',
       members: 
       [ { email: 'member1@example.com'}],     
     })

     await removeFromGroup(req, res);
     expect(res.status).toHaveBeenCalledWith(400);
     expect(res.json).toHaveBeenCalledWith({error: "Can't remove members from a group containing only one member",});

   });


   test('should return 401 if not authorized as admin', async () => {

     verifyAuth.mockImplementationOnce(() => ({ authorized: false, authType: "Admin" }));

     Group.findOne.mockReturnValueOnce({
      name: 'Group 1',
       members: 
       [ { email: 'member1@example.com'}, { email: 'member2@example.com' },
         { email: 'user1@example.com'}, { email: 'user2@example.com' } ],     
     })

     await removeFromGroup(req, res);
     expect(res.status).toHaveBeenCalledWith(401);
     expect(res.json).toHaveBeenCalledWith({ error: undefined });

   });


   test('should return 401 if not authorized as normal user', async () => {

     req = {params: { name: 'Group 1'}, body: { emails: ['user1@example.com', 'user2@example.com'] }, url: '`api/groups/Group 1/remove`'};

     verifyAuth.mockImplementationOnce(() => ({ authorized: false, authType: "Group" }));

     Group.findOne.mockReturnValueOnce({
      name: 'Group 1',
      members:[{ email: 'member1@example.com'}, { email: 'member2@example.com' }, { email: 'user1@example.com'}, { email: 'user2@example.com' }]})

     await removeFromGroup(req, res);
     expect(res.status).toHaveBeenCalledWith(401);
     expect(res.json).toHaveBeenCalledWith({ error: undefined });
     });


   test('should return 400 if request body is invalid', async () => {

     verifyAuth.mockImplementationOnce(() => ({ authorized: true, authType: "Admin" }));

     Group.findOne.mockReturnValueOnce({
       name: 'Group 1',
       members: [{ email: 'member1@example.com'}, { email: 'member2@example.com' }, { email: 'user1@example.com'}, { email: 'user2@example.com' }]})
  
     req.body.emails = 'invalid emails' ;

     await removeFromGroup(req, res);
     expect(res.status).toHaveBeenCalledWith(400);
     expect(res.json).toHaveBeenCalledWith({ error: 'request body does not contain all the necessary attributes' });

   });


   test('should return 400 if any email is empty or in the wrong format', async () => {

     verifyAuth.mockImplementationOnce(() => ({ authorized: true, authType: "Admin" }));

     Group.findOne.mockReturnValueOnce({
      name: 'Group 1',
       members: 
       [ { email: 'member1@example.com'}, { email: 'member2@example.com' },
         { email: 'user1@example.com'}, { email: 'user2@example.com' } ],     
     })

     req.body.emails = ['user1@example.com', '', 'invalid-email'];

     await removeFromGroup(req, res);

     expect(res.status).toHaveBeenCalledWith(400);
     expect(res.json).toHaveBeenCalledWith({ error: 'one or more emails are empty strings' });

   });


   test('should return 400 if any email does not have the right format', async () => {

     verifyAuth.mockImplementationOnce(() => ({ authorized: true, authType: "Admin" }));

     Group.findOne.mockReturnValueOnce({
      name: 'Group 1',
       members: 
       [ { email: 'member1@example.com'}, { email: 'member2@example.com' },
         { email: 'user1@example.com'}, { email: 'user2@example.com' } ],     
     })

     req.body.emails = ['user1@example',  'user1@com'];

     await removeFromGroup(req, res);
     expect(res.status).toHaveBeenCalledWith(400);
     expect(res.json).toHaveBeenCalledWith({ error : "not all emails have the right format" });

   });

  
   test('should return 400 error if all the emails either do not exist or are not in the group', async () => {

     req.body.emails = ['nonexisting@example.com', 'notingroup@example.com'];

     verifyAuth.mockImplementationOnce(() => ({ authorized: true, authType: "Admin" }));

     Group.findOne.mockReturnValueOnce({
      name: 'Group 1',
       members: 
       [ { email: 'member1@example.com'}, { email: 'member2@example.com' },
         { email: 'user1@example.com'}, { email: 'user2@example.com' } ],     
     })

     User.findOne.mockReturnValueOnce(null)

     User.findOne.mockReturnValueOnce({
      name: 'notingroup',
      _id: '126',
      email: 'notingroup@example.com',
      });

     await removeFromGroup(req, res);
     expect(res.status).toHaveBeenCalledWith(400);
     expect(res.json).toHaveBeenCalledWith({error : "all the `emails` either do not exist or are not in the group"});

   });


   test('should remove members from the group, saved the remaining last member, return the updated group', async () => {

     req.body.emails = ['user1@example.com', 'user2@example.com' ];

     verifyAuth.mockImplementationOnce(() => ({ authorized: true, authType: "Admin" }));

     Group.findOne.mockReturnValueOnce({
      name: 'Group 1',
       members: 
       [  { email: 'user1@example.com'}, { email: 'user2@example.com' } ] })

     User.findOne.mockReturnValueOnce({
      name: 'user1',
      _id: '123',
      email: 'user1@example.com',
      });

     User.findOne.mockReturnValueOnce({
      name: 'user2',
      _id: '124',
      email: 'user2@example.com',
      });
       
     Group.findOneAndUpdate.mockReturnValueOnce({
          name: 'Group 1',
           members: 
           [  {email:'user1@example.com'}],     
         })

     await removeFromGroup(req, res);
     expect(res.status).toHaveBeenCalledWith(200);
     expect(res.json).toHaveBeenCalledWith({
      data: {
        group: {
          name: 'Group 1',
          members: [{'email':'user1@example.com'}],
        },
        notInGroup: [],
        membersNotFound: [],
      },
      message: 'Token refreshed.'
     });

   });


   test('should remove members from the group and return the updated group', async () => {

     req.body.emails = ['user1@example.com', 'nonexisting@example.com', 'notingroup@example.com'];

     verifyAuth.mockImplementationOnce(() => ({ authorized: true, authType: "Admin" }));

     Group.findOne.mockReturnValueOnce({
      name: 'Group 1',
       members: 
       [ { email: 'member1@example.com'}, { email: 'member2@example.com' },
         { email: 'user1@example.com'}, { email: 'user2@example.com' } ],     
     })

     User.findOne.mockReturnValueOnce({
      name: 'user1',
      _id: '123',
      email: 'user1@example.com',
      });

     User.findOne.mockReturnValueOnce(null)

     User.findOne.mockReturnValueOnce({
      name: 'notingroup',
      _id: '126',
      email: 'notingroup@example.com',
      });
       
     Group.findOneAndUpdate.mockReturnValueOnce({
          name: 'Group 1',
           members: 
           [ { email: 'member1@example.com'}, { email: 'member2@example.com' }, { email: 'user2@example.com' }],     
         })

     await removeFromGroup(req, res);
     expect(res.status).toHaveBeenCalledWith(200);
     expect(res.json).toHaveBeenCalledWith({
      data: {
        group: {
          name: 'Group 1',
          members: [{'email':'member1@example.com'}, {'email':'member2@example.com'}, {'email':'user2@example.com'}],
        },
        notInGroup: ['notingroup@example.com'],
        membersNotFound: ['nonexisting@example.com'],
      },
      message: 'Token refreshed.'
     });

   });


   test('should return 400 if group contains only one member', async () => {

     verifyAuth.mockImplementationOnce(() => ({ authorized: true, authType: "Admin" }));

     Group.findOne.mockReturnValueOnce({
      name: 'Group 1',
       members: 
       [ { email: 'user1@example.com'}]  })
    
     req.body.emails = ['user1@example.com']; 
  
     await removeFromGroup(req, res);
     expect(res.status).toHaveBeenCalledWith(400);
     expect(res.json).toHaveBeenCalledWith({ error: "Can't remove members from a group containing only one member" });
   });


   test('should handle server errors and return 500', async () => {

     verifyAuth.mockImplementationOnce(() => ({ authorized: true, authType: "Admin" }));
     Group.findOne.mockRejectedValue(new Error("Internal server error"));

     await removeFromGroup(req, res);
     expect(res.status).toHaveBeenCalledWith(500);
     expect(res.json).toHaveBeenCalledWith({ error: "Internal server error" });

   });

  
});



  describe('deleteUser', () => {

   beforeEach(resetAllMocks);
     let req;
     let res;

   beforeEach(() => {
     req = {
      body: {email: "user1@example.com"}
     };
     res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
        refreshedTokenMessage: 'Token refreshed.',
      },
     };
   });


   test('should return 401 if user is not authorized as admin', async () => {

     verifyAuth.mockImplementationOnce(() => ({ authorized: false, authType: "Admin" }));

     await deleteUser(req, res);
     expect(res.status).toHaveBeenCalledWith(401);
     expect(res.json).toHaveBeenCalledWith({ error: undefined });

   });


   test('should return 400 if email is missing or not a string', async () => {

     verifyAuth.mockImplementationOnce(() => ({ authorized: true, authType: "Admin" }));

     req.body.email = 5;

     await deleteUser(req, res);
     expect(res.status).toHaveBeenCalledWith(400);
     expect(res.json).toHaveBeenCalledWith({error: "the request body does not contain all the necessary attributes"}) ;

   });


   test('should return 400 if email is an empty string', async () => {

     verifyAuth.mockImplementationOnce(() => ({ authorized: true, authType: "Admin" }));

     req.body.email = '' ;

     await deleteUser(req, res);
     expect(res.status).toHaveBeenCalledWith(400);
     expect(res.json).toHaveBeenCalledWith({ error: 'email is an empty string' });

   });


   test('should return 400 if email is not in the correct format', async () => {

     verifyAuth.mockImplementationOnce(() => ({ authorized: true, authType: "Admin" }));

     req.body.email = 'invalid-email';

     await deleteUser(req, res);
     expect(res.status).toHaveBeenCalledWith(400);
     expect(res.json).toHaveBeenCalledWith({ error: "email is not in the correct format" });

   });


   test('should return 400 if user is not found', async () => {

     verifyAuth.mockImplementationOnce(() => ({ authorized: true, authType: "Admin" }));

     User.findOne = jest.fn().mockResolvedValueOnce(null);

     await deleteUser(req, res);
     expect(res.status).toHaveBeenCalledWith(400);
     expect(res.json).toHaveBeenCalledWith({ error: 'User not found' });

   });


   test('should return 400 if trying to delete an admin user', async () => {

     verifyAuth.mockImplementationOnce(() => ({ authorized: true, authType: "Admin" }));

     User.findOne.mockReturnValueOnce({
      name: 'user1',
      _id: '123',
      email: 'user1@example.com',
      role: 'Admin'
      });

     await deleteUser(req, res);
     expect(res.status).toHaveBeenCalledWith(400);
     expect(res.json).toHaveBeenCalledWith({ error: 'Admins cannot be deleted' });

   });


   test('should delete user and return deleted transaction count and group deletion status', async () => {
    
     verifyAuth.mockImplementationOnce(() => ({ authorized: true, authType: "Admin" }));

     User.findOne.mockReturnValueOnce({
       name: 'user1',
       _id: '123',
       email: 'user1@example.com',
     });
    
     const deleteManyMock = jest.fn().mockResolvedValueOnce({ deletedCount: 3 });
     transactions.deleteMany = deleteManyMock;

     Group.findOne.mockReturnValueOnce({
       name: 'Group 1',
       members: 
        [ { email: 'member1@example.com'}, { email: 'member2@example.com' }, { email: 'user1@example.com' }], 
        save: jest.fn(),
     })

     await deleteUser(req, res);
     expect(Group.findOne).toHaveBeenCalledWith({ members: { $elemMatch: { email: 'user1@example.com' } } });
     expect(Group.deleteOne).not.toHaveBeenCalled();
     expect(res.status).toHaveBeenCalledWith(200);
     expect(res.json).toHaveBeenCalledWith({
     data: {
       deletedTransactions: 3,
       deletedFromGroup: true,
     },
     message: res.locals.refreshedTokenMessage,
    });

   });


   test('should delete user and return deleted transaction count and group deletion status if last user in group', async () => {

     verifyAuth.mockImplementationOnce(() => ({ authorized: true, authType: "Admin" }));

     User.findOne.mockReturnValueOnce({name: 'user1', _id: '123', email: 'user1@example.com'});
 
     const deleteOneMock = jest.fn().mockResolvedValueOnce({ deletedCount: 2 });
     transactions.deleteMany = deleteOneMock;

     Group.findOne.mockReturnValueOnce({name: 'Group 1', members: [{ email: 'user1@example.com' }], save: jest.fn()})
     Group.deleteOne.mockReturnValueOnce({})

     await deleteUser(req, res);
     expect(Group.findOne).toHaveBeenCalledWith({ members: { $elemMatch: { email: 'user1@example.com' } } });
     expect(res.status).toHaveBeenCalledWith(200);
     expect(res.json).toHaveBeenCalledWith({
     data: {
      deletedTransactions: 2,
      deletedFromGroup: true,
     },
     message: res.locals.refreshedTokenMessage,
     });

   });


   test('should handle server errors and return 500', async () => {

     verifyAuth.mockImplementationOnce(() => ({ authorized: true, authType: "Admin" }));

     User.findOne.mockRejectedValue(new Error("Internal server error"));

     await deleteUser(req, res);
     expect(res.status).toHaveBeenCalledWith(500);
     expect(res.json).toHaveBeenCalledWith({ error: "Internal server error" });

   });


 });



 describe('deleteGroup', () => {
   let req;
   let res;

   beforeEach(() => {
    req = {
      body: {name: "Group 1"},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {
      refreshedTokenMessage: 'Token refreshed.',
      },
    };
   });


   test('should return 401 if user is not authorized as admin', async () => {

     verifyAuth.mockImplementationOnce(() => ({ authorized: false, authType: "Admin" }));
  
     await deleteGroup(req, res);
     expect(res.status).toHaveBeenCalledWith(401);
     expect(res.json).toHaveBeenCalledWith({ error: undefined });

   });


   test('should return 400 if name is missing or not a string', async () => {

     verifyAuth.mockImplementationOnce(() => ({ authorized: true, authType: "Admin" }));
  
     req.body.name = null;

     await deleteGroup(req, res);
     expect(res.status).toHaveBeenCalledWith(400);
     expect(res.json).toHaveBeenCalledWith({ error: 'the request body does not contain all the necessary attributes' });

   });


   test('should return 400 if name is an empty string', async () => {

     verifyAuth.mockImplementationOnce(() => ({ authorized: true, authType: "Admin" }));

     req.body.name = '';

     await deleteGroup(req, res);
     expect(res.status).toHaveBeenCalledWith(400);
     expect(res.json).toHaveBeenCalledWith({ error: 'invalid name' });

   });


   test('should return 400 if group does not exist', async () => {

     verifyAuth.mockImplementationOnce(() => ({ authorized: true, authType: "Admin" }));

     Group.findOne.mockReturnValueOnce(null)

     await deleteGroup(req, res);
     expect(res.status).toHaveBeenCalledWith(400);
     expect(res.json).toHaveBeenCalledWith({ error: 'Group does not exist' });

   });


   test('should delete group and return success message', async () => {

     verifyAuth.mockImplementationOnce(() => ({ authorized: true, authType: "Admin" }));

     Group.findOne.mockReturnValueOnce({
      name: 'Group 1',
       members: 
       [{ email: 'user1@example.com' }], 
       save: jest.fn(),
     })

     Group.deleteOne.mockReturnValueOnce({})

     await deleteGroup(req, res);
     expect(Group.deleteOne).toHaveBeenCalledWith({ name: 'Group 1' });
     expect(res.status).toHaveBeenCalledWith(200);
     expect(res.json).toHaveBeenCalledWith({
      data: { message: 'Group deleted correctly' },
      message: res.locals.refreshedTokenMessage,
     });

   });


   test('should handle server errors and return 500', async () => {

     verifyAuth.mockImplementationOnce(() => ({ authorized: true, authType: "Admin" }));
     Group.findOne.mockRejectedValue(new Error("Internal server error"));
     
     await deleteGroup(req, res);
     expect(res.status).toHaveBeenCalledWith(500);
     expect(res.json).toHaveBeenCalledWith({ error: "Internal server error" });

   });
 
});
  
