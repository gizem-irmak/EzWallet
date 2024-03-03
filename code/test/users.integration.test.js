import request from 'supertest';
import { app } from '../app';
import { User, Group } from '../models/User.js';
import { transactions, categories} from '../models/model';
import mongoose, { Model } from 'mongoose';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

/**
 * Necessary setup in order to create a new database for testing purposes before starting the execution of test cases.
 * Each test suite has its own database in order to avoid different tests accessing the same database at the same time and expecting different data.
 */

dotenv.config();

beforeAll(async () => {

   const dbName = "testingDatabaseUsers";
   const url = `${process.env.MONGO_URI}/${dbName}`;

   await mongoose.connect(url, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
   });
  
});



afterAll(async () => {

   await mongoose.connection.db.dropDatabase();
   await mongoose.connection.close();

});



describe("getUsers", () => {
  
   beforeEach(async () => {
    await User.deleteMany({})
   })


   it('should return an array of users with their attributes if called by an authenticated admin user', async () => {
    
     const adminUser = new User({
      email: 'admin@example.com',
      username: 'admin',
      role: 'Admin',
      password: 'admin123'
     });
     await adminUser.save();

     const adminAccessToken = jwt.sign(
      { email: adminUser.email, username: adminUser.username, role: adminUser.role },
      process.env.ACCESS_KEY, { expiresIn: '1y' }
     );

     const response = await request(app)
      .get('/api/users')
      .set('Cookie', `accessToken=${adminAccessToken}; refreshToken=${adminAccessToken}`);

     expect(response.status).toBe(200);
     expect(response.body.data).toBeInstanceOf(Array);
     expect(response.body.data.length).toBeGreaterThan(0);
     expect(response.body.data[0]).toHaveProperty('username');
     expect(response.body.data[0]).toHaveProperty('email');
     expect(response.body.data[0]).toHaveProperty('role');

   });


   it('should return a 401 error if called by an authenticated non-admin user', async () => {
   
     const regularUser = new User({
      email: 'user@test.com',
      username: 'user',
      role: 'Regular',
      password: 'user123' // Provide a password
     });
     await regularUser.save();

     const regularAccessToken = jwt.sign(
      { email: regularUser.email, username: regularUser.username, role: regularUser.role },
      process.env.ACCESS_KEY,
      { expiresIn: '1y' }
     );

     const response = await request(app)
      .get('/api/users')
      .set('Cookie', `accessToken=${regularAccessToken}; refreshToken=${regularAccessToken}`);

     expect(response.status).toBe(401);
     expect(response.body.error).toBe('Mismatched role');

   });


   it('should return a 401 error if called by an unauthenticated user', async () => {
    
     const response = await request(app).get('/api/users');

     expect(response.status).toBe(401);
     expect(response.body.error).toBe('Unauthorized');

   });


   it('should return a 500 error if an error occurs while retrieving the list of users', async () => {
    
     const adminUser = new User({
      email: 'admin@test.com',
      username: 'admin',
      role: 'Admin',
      password: 'admin123'
     });
     await adminUser.save();

     const adminAccessToken = jwt.sign(
      { email: adminUser.email, username: adminUser.username, role: adminUser.role },
      process.env.ACCESS_KEY,
      { expiresIn: '1y' }
     );

     jest.spyOn(User, 'find').mockImplementation(() => {
     throw new Error('Internal server error');
     });

     const response = await request(app)
      .get('/api/users')
      .set('Cookie', `accessToken=${adminAccessToken}; refreshToken=${adminAccessToken}`);

     expect(response.status).toBe(500);
     expect(response.body.error).toBe('Internal server error');
     User.find.mockRestore();
  
   });


});



describe('getUser', () => {
  
   beforeEach(async () => {
    await User.deleteMany({})
   })


   it('should return the user data if called by an authenticated user', async () => {
    
     const user = new User({
      email: 'user@test.com',
      username: 'user',
      role: 'Regular',
      password: 'user123'
     });
     await user.save();

     const accessToken = jwt.sign(
      { email: user.email, username: user.username, role: user.role },
      process.env.ACCESS_KEY,
      { expiresIn: '1y' }
     );

     const response = await request(app)
      .get(`/api/users/${user.username}`)
      .set('Cookie', `accessToken=${accessToken}; refreshToken=${accessToken}`);

     expect(response.status).toBe(200);
     expect(response.body.data).toEqual({
      username: user.username,
      email: user.email,
      role: user.role
     });

   });


   it('should return the user data if called by an authenticated admin user', async () => {
    
     const adminUser = new User({
      email: 'admin@test.com',
      username: 'admin',
      role: 'Admin',
      password: 'admin123'
     });
     await adminUser.save();

     const adminAccessToken = jwt.sign(
      { email: adminUser.email, username: adminUser.username, role: adminUser.role },
      process.env.ACCESS_KEY,
      { expiresIn: '1y' }
     );

     const user = new User({
      email: 'user@test.com',
      username: 'user',
      role: 'Regular',
      password: 'user123'
     });
     await user.save();

     const response = await request(app)
      .get(`/api/users/${user.username}`)
      .set('Cookie', `accessToken=${adminAccessToken}; refreshToken=${adminAccessToken}`);

     expect(response.status).toBe(200);
     expect(response.body.data).toEqual({ username: user.username, email: user.email, role: user.role

    });
   
   });


   it('should return a 401 error if called by an authenticated user trying to access another user\'s information', async () => {
    
     const user = new User({
      email: 'user@test.com',
      username: 'user',
      role: 'Regular',
      password: 'user123'
     });
     await user.save();

     const accessToken = jwt.sign(
      { email: user.email, username: user.username, role: user.role },
      process.env.ACCESS_KEY,
      { expiresIn: '1y' }
     );
 
     const otherUser = new User({
      email: 'other@test.com',
      username: 'other',
      role: 'Regular',
      password: 'other123'
     });
     await otherUser.save();

     const response = await request(app)
      .get(`/api/users/${otherUser.username}`)
      .set('Cookie', `accessToken=${accessToken}; refreshToken=${accessToken}`);

     expect(response.status).toBe(401);
     expect(response.body.error).toBe('Mismatched role');

   });


   it('should return a 401 error if called by an unauthenticated user', async () => {
   
     const user = new User({
      email: 'user@test.com',
      username: 'user',
      role: 'Regular',
      password: 'user123'
     });
     await user.save();

     const response = await request(app).get(`/api/users/${user.username}`);

     expect(response.status).toBe(401);
     expect(response.body.error).toBe('Unauthorized');

   });


  it('should return a 400 error if the requested user is not found', async () => {
    
     const adminUser = new User({
      email: 'admin@test.com',
      username: 'admin',
      role: 'Admin',
      password: 'admin123'
     });
     await adminUser.save();

     const adminAccessToken = jwt.sign(
      { email: adminUser.email, username: adminUser.username, role: adminUser.role },
      process.env.ACCESS_KEY,
      { expiresIn: '1y' }
     );

     const response = await request(app)
      .get('/api/users/nonexistentuser')
      .set('Cookie', `accessToken=${adminAccessToken}; refreshToken=${adminAccessToken}`);

     expect(response.status).toBe(400);
     expect(response.body.error).toBe('User not found');

   });


   it('should return a 500 error if an error occurs while retrieving the user', async () => {
    
     const adminUser = new User({
      email: 'admin@test.com',
      username: 'admin',
      role: 'Admin',
      password: 'admin123'
     });
     await adminUser.save();

     const adminAccessToken = jwt.sign(
      { email: adminUser.email, username: adminUser.username, role: adminUser.role },
      process.env.ACCESS_KEY,
      { expiresIn: '1y' }
     );

     jest.spyOn(User, 'findOne').mockImplementation(() => {
      throw new Error('Internal server error');
    });
  
     const response = await request(app)
      .get(`/api/users/${adminUser.username}`)
      .set('Cookie', `accessToken=${adminAccessToken}; refreshToken=${adminAccessToken}`);

     expect(response.status).toBe(500);
     expect(response.body.error).toBe('Internal server error');
     User.findOne.mockRestore();

   });


});



describe('createGroup', () => {

  beforeEach(async () => {
    await Group.deleteMany({});
    await User.deleteMany({});
  });


   it('should create a new group successfully', async () => {

   const user = new User({
    email: 'user@test.com',
    username: 'user',
    role: 'Regular',
    password: 'user123',
   });
   await user.save();

   const user2 = new User({
    email: 'member2@test.com',
    username: 'member2',
    role: 'Regular',
    password: 'member123',
   });
   await user2.save();

   const accessToken = jwt.sign(
    { email:'user@test.com', username: 'user', role: 'Regular' },
    process.env.ACCESS_KEY,
    { expiresIn: '1y' }
   );

   const requestBody = {
     name: 'Test Group',
     memberEmails: ['user@test.com', 'member2@test.com'],
   };
  
   const response = await request(app)
    .post('/api/groups')
    .set('Cookie', `accessToken=${accessToken}; refreshToken=${accessToken}`)
    .send(requestBody);

   expect(response.status).toBe(200);
   expect(response.body.data.group.name).toBe(requestBody.name);
   expect(response.body.data.group.members).toEqual([{"email": "user@test.com"}, {"email": "member2@test.com"}]);
   expect(response.body.data.alreadyInGroup).toEqual([]);
   expect(response.body.data.membersNotFound).toEqual([]);

   });


   it('should create a new group successfully, without calling user e-mail in the request body', async () => {
  
     const user = new User({
      email: 'user@test.com',
      username: 'user',
      role: 'Regular',
      password: 'user123',
     });
     await user.save();
  
     const user2 = new User({
      email: 'member2@test.com',
      username: 'member2',
      role: 'Regular',
      password: 'member123',
     });
     await user2.save();
  
     const accessToken = jwt.sign(
      { email: user.email, username: user.username, role: user.role },
      process.env.ACCESS_KEY,
      { expiresIn: '1y' }
     );
  
     const requestBody = {
       name: 'Test Group',
       memberEmails: ['member2@test.com'],
     };
    
    
     const response = await request(app)
      .post('/api/groups')
      .set('Cookie', `accessToken=${accessToken}; refreshToken=${accessToken}`)
      .send(requestBody);
  
     expect(response.status).toBe(200);
     expect(response.body.data.group.name).toBe(requestBody.name);     
     expect(response.body.data.alreadyInGroup).toEqual([]);
     expect(response.body.data.membersNotFound).toEqual([]);  

   });


   it('should return a 400 error if the group name is already used', async () => {
  
     const user = new User({
      email: 'user@test.com',
      username: 'user',
      role: 'Regular',
      password: 'user123',
     });
     await user.save();

     const accessToken = jwt.sign(
     { email: user.email, username: user.username, role: user.role },
     process.env.ACCESS_KEY, { expiresIn: '1y' }
     );
 
     const existingGroup = new Group({
     name: 'Existing Group',
     members: [],
     });
     await existingGroup.save();

     const requestBody = {
     name: 'Existing Group',
     memberEmails: ['member1@test.com', 'member2@test.com'],
     };

     const response = await request(app)
     .post('/api/groups')
     .set('Cookie', `accessToken=${accessToken}; refreshToken=${accessToken}`)
     .send(requestBody);

     expect(response.status).toBe(400);
     expect(response.body.error).toBe('Group name already used');

   });


   it('should return a 400 error if all the member emails either do not exist or are already in a group', async () => {
    
     const user = new User({
      email: 'user@example.com',
      username: 'user',
      role: 'Regular',
      password: 'user123',
     });
     await user.save();
    
     const member2 = new User({
      email: 'member2@example.com',
      username: 'member2',
      role: 'Regular',
      password: 'member123',
     });
     await member2.save();

     const group1 = await Group.create(
       { name: 'Group1', 
       members: [{ email: 'member2@example.com', user: member2._id }] });
     await group1.save();
    
     const accessToken = jwt.sign(
        { email: user.email, username: user.username, role: user.role },
        process.env.ACCESS_KEY, { expiresIn: '1y' }
     );
    
     const requestBody = {
         name: 'Test Group',
         memberEmails: ['member2@example.com', 'member1@example.com'],
      };
       
     const response = await request(app)
        .post('/api/groups')
        .set('Cookie', `accessToken=${accessToken}; refreshToken=${accessToken}`)
        .send(requestBody);
    
     expect(response.status).toBe(400);
     expect(response.body.error).toBe("all the `memberEmails` either do not exist or are already in a group")
    
       
   });


   it('should return a 400 error if the request body validation fails', async () => {
   
     const user = new User({
       email: 'user@test.com',
       username: 'user',
       role: 'Regular',
       password: 'user123',
     });
     await user.save();

     const accessToken = jwt.sign(
     { email: user.email, username: user.username, role: user.role },
     process.env.ACCESS_KEY, { expiresIn: '1y' }
     );

     const requestBody = {}; 

     const response = await request(app)
     .post('/api/groups')
     .set('Cookie', `accessToken=${accessToken}; refreshToken=${accessToken}`)
     .send(requestBody);

     expect(response.status).toBe(400);
     expect(response.body.error).toBe('request body does not contain all the necessary attributes');

   });
  

   it('should return a 400 error if the user calling is already in a group', async () => {

     const user = await User.create({ username: 'user1', email: 'user1@example.com', role: 'Regular', password: 'user123'});
     const group = await Group.create({ name: 'Group1', members: [{ email: 'user1@example.com', user: user._id }] });
  
     const accessToken = jwt.sign({ username: 'user1', email: 'user1@example.com', role: 'Regular' }, process.env.ACCESS_KEY, { expiresIn: '1y' });
  
     const requestBody = {
      name: 'NewGroup',
      memberEmails: ['user2@example.com', 'user3@example.com'],
     };
  
     const response = await request(app)
      .post('/api/groups')
      .set('Cookie', `accessToken=${accessToken}; refreshToken=${accessToken}`)
      .send(requestBody);
  
     expect(response.status).toBe(400);
     expect(response.body.error).toBe('User calling already in a group');

   });


  it('should return a 401 error if the user is not authorized', async () => {
     
     await request(app)
      .post('/api/groups')
      .expect(401)
      .then((response) => {
        expect(response.body.error).toEqual('Unauthorized');
     });

  });


  it('should return an error message if there is an error', async () => {

    const mockError = new Error('Database connection failed');

    jest.spyOn(Group, 'findOne').mockImplementationOnce(() => Promise.reject(mockError));

    const user = new User({
        email: 'user@test.com',
        username: 'user',
        role: 'Regular',
        password: 'user123',
     });
     await user.save();

     const accessToken = jwt.sign(
     { email: user.email, username: user.username, role: user.role },
        process.env.ACCESS_KEY, { expiresIn: '1y' }
     );
    
     const requestBody = {
         name: 'Test Group',
         memberEmails: ['member2@test.com'],
     };
      
     await request(app)
      .post("/api/groups")
      .set("Cookie", `accessToken=${accessToken}; refreshToken=${accessToken}`)
      .send(requestBody)
      .then((response) => {

     expect(response.status).toBe(500)
     expect(response.body.error).toEqual('Database connection failed')
     })

     jest.resetAllMocks();

  })   

});



describe('getGroups', () => {

   beforeEach(async () => {
    await Group.deleteMany({});
    await User.deleteMany({});
   });


   it('should return an array of groups with their attributes if called by an authenticated admin user', async () => {
    
     const user1 = await User.create({ username: 'user1', email: 'user1@example.com', role: 'Regular', password: 'user123'});
     const user2 = await User.create({ username: 'user2', email: 'user2@example.com', role: 'Regular', password: 'user124'});

     const group1 = await Group.create({ name: 'Group1', members: [{ email: "user1@example.com", user: user1._id }] });
     const group2 = await Group.create({ name: 'Group2', members: [{ email: "user2@example.com", user: user2._id }] });


     const accessToken = jwt.sign({ username: 'admin', email: 'admin@example.com', role: 'Admin' }, process.env.ACCESS_KEY, { expiresIn: '1y' });

     await request(app)
     .get('/api/groups')
     .set('Cookie', `accessToken=${accessToken}; refreshToken=${accessToken}`)
     .expect(200)
     .then((response) => {
    
     expect(response.body.data.length).toBe(2);
     expect(response.status).toBe(200);
     expect(response.body.data).toHaveLength(2);
     expect(response.body.data[0].name).toBe(group1.name);
     expect(response.body.data[0].members).toEqual(expect.arrayContaining( [{"email": "user1@example.com"}]));
     expect(response.body.data[1].name).toBe(group2.name);
     expect(response.body.data[1].members).toEqual(expect.arrayContaining( [{"email": "user2@example.com"}]));
     });

   });


   it('should return a 401 error if called by a non-admin user', async () => {
    
     const accessToken = jwt.sign({ username: 'user1', email: 'user1@example.com', role: 'Regular' }, process.env.ACCESS_KEY, { expiresIn: '1y' });

     const response = await request(app)
      .get('/api/groups')
      .set('Cookie', `accessToken=${accessToken}; refreshToken=${accessToken}`);

     expect(response.status).toBe(401);
     expect(response.body.error).toBe('Mismatched role');

   });

  
   it('should return a 500 error if an internal server error occurs', async () => {
     
     jest.spyOn(Group, 'find').mockImplementation(() => {
      throw new Error('Internal server error');
     });

     const accessToken = jwt.sign({ username: 'admin', email: 'admin@example.com', role: 'Admin' }, process.env.ACCESS_KEY, { expiresIn: '1y' });

     const response = await request(app)
      .get('/api/groups')
      .set('Cookie', `accessToken=${accessToken}; refreshToken=${accessToken}`);

     expect(response.status).toBe(500);
     expect(response.body.error).toBe('Internal server error');

   });


})



describe('getGroup', () => {


   beforeEach(async () => {
    await Group.deleteMany({});
    await User.deleteMany({});
   });


   it('should return the group information if called by an authenticated user in the group', async () => {

     const user1 = await User.create({ username: 'user1', email: 'user1@example.com', role: 'Regular', password: 'user123'});
     const user2 = await User.create({ username: 'user2', email: 'user2@example.com', role: 'Regular', password: 'user124'});

     const group1 = await Group.create({ name: 'Group1', members: [{ email: 'user1@example.com', user: user1._id }, { email: 'user2@example.com', user: user2._id }] });
   
     const accessToken = jwt.sign({ username: 'user1', email: 'user1@example.com', role: 'Regular' }, process.env.ACCESS_KEY, { expiresIn: '1y' });

     const response = await request(app)
     .get('/api/groups/Group1')
     .set('Cookie', `accessToken=${accessToken}; refreshToken=${accessToken}`)
     .then((response) => {
    
     expect(response.status).toBe(200);
     expect(response.body.data.name).toBe(group1.name);
     expect(response.body.data.members[0]).toEqual({"email": "user1@example.com"});
     expect(response.body.data.members[1]).toEqual({"email": "user2@example.com"});

  })

   });


   it('should eturns a 401 error if called by an authenticated user who is neither part of the group nor an admin', async () => {

      const user1 = await User.create({ username: 'user1', email: 'user1@example.com', role: 'Regular', password: 'user123'});
     const user2 = await User.create({ username: 'user2', email: 'user2@example.com', role: 'Regular', password: 'user124'});
     const user = await User.create({ username: 'user', email: 'user@example.com', role: 'Regular', password: 'user123'});
 
     const group1 = await Group.create({ name: 'Group1', members: [{ email: 'user1@example.com', user: user1._id }, { email: 'user2@example.com', user: user2._id }] });
   
     const accessToken = jwt.sign({ username: 'user', email: 'user@example.com', role: 'Regular' }, process.env.ACCESS_KEY, { expiresIn: '1y' });

     const response = await request(app)
     .get('/api/groups/Group1')
     .set('Cookie', `accessToken=${accessToken}; refreshToken=${accessToken}`)
     .then((response) => {
    
     expect(response.status).toBe(401);
     expect(response.body.error).toBe("Mismatched role");
   
  })
   });


   it('should return a 400 error if the group does not exist', async () => {

     const nonExistentGroupName = 'NonExistentGroup';
     const response = await request(app).get(`/api/groups/${nonExistentGroupName}`);

     expect(response.status).toBe(400);
     expect(response.body.error).toBe('Group does not exist');

   });


});



describe('addToGroup', () => {


   beforeEach(async () => {
    await Group.deleteMany({});
    await User.deleteMany({});
   });


   it('should add users to the group and return the updated group information', async () => {

     const admin = await User.create({ username: 'admin', email: 'admin@example.com', role: 'Admin', password: 'admin123'});
     const user1 = await User.create({ username: 'user1', email: 'user1@example.com', role: 'Regular', password: 'user124'});
     const user2 = await User.create({ username: 'user2', email: 'user2@example.com', role: 'Regular', password: 'user124'});
 
     const group1 = await Group.create({ 
      name: 'Group1', 
      members: [{ email: 'user1@example.com', user: user1._id }]});
     group1.save();
 
     const accessToken = jwt.sign({ username: 'admin', email: 'admin@example.com', role: 'Admin' }, process.env.ACCESS_KEY, { expiresIn: '1y' });

     const requestBody = { emails: ["user2@example.com"]};

     const response = await request(app)
     .patch('/api/groups/Group1/insert')
     .set('Cookie', `accessToken=${accessToken}; refreshToken=${accessToken}`)
     .send(requestBody)
     .expect(200)    
     .then((response) => {
    
     expect(response.status).toBe(200);       
     expect(response.body.data.group.name).toBe(group1.name);
     expect(response.body.data.group.members).toEqual( [{"email": "user1@example.com"}, {"email": "user2@example.com"}]);

     });

   });


   it('should return a 400 error if the request body does not contain all the necessary attributes', async () => {
  
     const admin = await User.create({ username: 'admin', email: 'admin@example.com', role: 'Admin', password: 'admin123'});
     const user1 = await User.create({ username: 'user1', email: 'user1@example.com', role: 'Regular', password: 'user124'});
     const user2 = await User.create({ username: 'user2', email: 'user2@example.com', role: 'Regular', password: 'user124'});
 
     const group1 = await Group.create({ 
      name: 'Group1', 
      members: [{ email: 'user1@example.com', user: user1._id }]});
     group1.save();
 
     const accessToken = jwt.sign({ username: 'admin', email: 'admin@example.com', role: 'Admin' }, process.env.ACCESS_KEY, { expiresIn: '1y' });

     const requestBody = {};

     const response = await request(app)
     .patch('/api/groups/Group1/insert')
     .set('Cookie', `accessToken=${accessToken}; refreshToken=${accessToken}`)
     .send(requestBody)
     .expect(400)    
     .then((response) => {
    
     expect(response.status).toBe(400);       
     expect(response.body.error).toBe('request body does not contain all the necessary attributes');

     });

   });


   it('should returns a 401 error if called by an authenticated user who is not an admin', async () => {

     const admin = await User.create({ username: 'admin', email: 'admin@example.com', role: 'Admin', password: 'admin123'});
     const user1 = await User.create({ username: 'user1', email: 'user1@example.com', role: 'Regular', password: 'user124'});
     const user2 = await User.create({ username: 'user2', email: 'user2@example.com', role: 'Regular', password: 'user124'});
     
     const group1 = await Group.create({ 
      name: 'Group1', 
      members: [{ email: 'user1@example.com', user: user1.id }]});
     group1.save();
      
     const requestBody = { emails: ["user2@example.com"]};
    
     const response = await request(app)
        .patch('/api/groups/Group1/insert')
        .send(requestBody)  
        .then((response) => {
        
     expect(response.status).toBe(401);       
     expect(response.body.error).toBe("Unauthorized");

    });

   });


   it('should returns a 401 error if called by an authenticated user who is not part of the group', async () => {

     const user = await User.create({ username: 'user', email: 'user@example.com', role: 'Regular', password: 'user123'});
     const user1 = await User.create({ username: 'user1', email: 'user1@example.com', role: 'Regular', password: 'user124'});
     const user2 = await User.create({ username: 'user2', email: 'user2@example.com', role: 'Regular', password: 'user124'});
     
     const accessToken = jwt.sign({ username: 'user', email: 'user@example.com', role: 'Regular' }, process.env.ACCESS_KEY, { expiresIn: '1y' });
      
     const group1 = await Group.create({ 
      name: 'Group1', 
      members: [{ email: 'user1@example.com', user: user1.id }]});
     group1.save();
      
     const requestBody = {emails: ["user2@example.com"]};
    
     const response = await request(app)
        .patch('/api/groups/Group1/add')
        .set('Cookie', `accessToken=${accessToken}; refreshToken=${accessToken}`)
        .send(requestBody)  
        .then((response) => {
        
      expect(response.status).toBe(401);       
      expect(response.body.error).toBe("User is not a group member");

      });  

   });


   it('should return 400 error if the group name passed as a route parameter does not represent a group in the database', async () => {

      const admin = await User.create({ username: 'admin', email: 'admin@example.com', role: 'Admin', password: 'admin123'});
      const user1 = await User.create({ username: 'user1', email: 'user1@example.com', role: 'Regular', password: 'user124'});
      const user2 = await User.create({ username: 'user2', email: 'user2@example.com', role: 'Regular', password: 'user124'});
    
      const accessToken = jwt.sign({ username: 'admin', email: 'admin@example.com', role: 'Admin' }, process.env.ACCESS_KEY, { expiresIn: '1y' });
    
      const requestBody = { emails: ["user2@example.com"]};
    
      const response = await request(app)
        .patch('/api/groups/Group1/insert')
        .set('Cookie', `accessToken=${accessToken}; refreshToken=${accessToken}`)
        .send(requestBody)
        .expect(400)    
        .then((response) => {
        
      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Group does not exist");     

      });

   });


   it('should return a 400 error if all the provided emails represent users that are already in a group or do not exist in the database', async () => {

      const admin = await User.create({ username: 'admin', email: 'admin@example.com', role: 'Admin', password: 'admin123'});
      const user1 = await User.create({ username: 'user1', email: 'user1@example.com', role: 'Regular', password: 'user124'});

      const group1 = await Group.create({ 
      name: 'Group1', 
      members: [{ email: 'user1@example.com', user: user1._id }]});
      group1.save();
     
      const accessToken = jwt.sign({ username: 'admin', email: 'admin@example.com', role: 'Admin' }, process.env.ACCESS_KEY, { expiresIn: '1y' });
    
      const requestBody = { emails: ["user1@example.com", "user2@example.com"]};
    
      const response = await request(app)
        .patch('/api/groups/Group1/insert')
        .set('Cookie', `accessToken=${accessToken}; refreshToken=${accessToken}`)
        .send(requestBody)
        .expect(400)    
        .then((response) => {
        
      expect(response.status).toBe(400);       
      expect(response.body.error).toBe("all the `emails` either do not exist or are already in a group");

      });

   });


   it('should returns a 400 error if at least one of the member emails is not in a valid email format', async () => {

      const admin = await User.create({ username: 'admin', email: 'admin@example.com', role: 'Admin', password: 'admin123'});
      const user1 = await User.create({ username: 'user1', email: 'user1@example.com', role: 'Regular', password: 'user124'});
      const user2 = await User.create({ username: 'user2', email: 'invalid-format', role: 'Regular', password: 'user124'});
     
      const group1 = await Group.create({ 
      name: 'Group1', 
      members: [{ email: 'user1@example.com', user: user1._id }]});
      group1.save();
     
      const accessToken = jwt.sign({ username: 'admin', email: 'admin@example.com', role: 'Admin' }, process.env.ACCESS_KEY, { expiresIn: '1y' });
    
      const requestBody = { emails: ["invalid-format"]};
    
      const response = await request(app)
        .patch('/api/groups/Group1/insert')
        .set('Cookie', `accessToken=${accessToken}; refreshToken=${accessToken}`)
        .send(requestBody)
        .expect(400)    
        .then((response) => {
        
      expect(response.status).toBe(400);  
      expect(response.body.error).toBe("not all emails have the right format");    

      });

   });


   it('should returns a 400 error if at least one of the member emails is an empty string', async () => {

      const admin = await User.create({ username: 'admin', email: 'admin@example.com', role: 'Admin', password: 'admin123'});
      const user1 = await User.create({ username: 'user1', email: 'user1@example.com', role: 'Regular', password: 'user124'});
      const user2 = await User.create({ username: 'user2', email: 'user2@example.com', role: 'Regular', password: 'user124'});
     
      const group1 = await Group.create({ 
      name: 'Group1', 
      members: [{ email: 'user1@example.com', user: user1._id }]});
      group1.save();
     
      const accessToken = jwt.sign({ username: 'admin', email: 'admin@example.com', role: 'Admin' }, process.env.ACCESS_KEY, { expiresIn: '1y' });
    
      const requestBody = { emails: [""]};
    
      const response = await request(app)
        .patch('/api/groups/Group1/insert')
        .set('Cookie', `accessToken=${accessToken}; refreshToken=${accessToken}`)
        .send(requestBody)
        .expect(400)    
        .then((response) => {
        
      expect(response.status).toBe(400);       
      expect(response.body.error).toBe("one or more emails are an empty string");  

      });

   });


});



describe('removeFromGroup', () => {

  beforeEach(async () => {
    await Group.deleteMany({});
    await User.deleteMany({});
   });

   it('should successfully remove members from the group for an admin user', async () => {

     const admin = await User.create({ username: 'admin', email: 'admin@example.com', role: 'Admin', password: 'admin123'});
     const user1 = await User.create({ username: 'user1', email: 'user1@example.com', role: 'Regular', password: 'user124'});
     const user2 = await User.create({ username: 'user2', email: 'user2@example.com', role: 'Regular', password: 'user124'});
 
     const group1 = await Group.create({ 
      name: 'Group1', 
      members: [{ email: 'user1@example.com', user: user1._id }, { email: 'user2@example.com', user: user2._id }]});
      group1.save();
 
      const accessToken = jwt.sign({ username: 'admin', email: 'admin@example.com', role: 'Admin' }, process.env.ACCESS_KEY, { expiresIn: '1y' });

      const requestBody = { emails: ["user2@example.com"]};

      const response = await request(app)
      .patch('/api/groups/Group1/pull')
      .set('Cookie', `accessToken=${accessToken}; refreshToken=${accessToken}`)
      .send(requestBody)
      .expect(200)    
      .then((response) => {
    
     expect(response.status).toBe(200);       
     expect(response.body.data.group.name).toBe(group1.name);
     expect(response.body.data.group.members).toEqual([{"email": "user1@example.com"}]);
     expect(response.body.data.group.members).not.toContain('user2@example.com');

    });

   });



   it('should successfully remove members from the group for a group member', async () => {

      const admin = await User.create({ username: 'admin', email: 'admin@example.com', role: 'Admin', password: 'admin123'});
      const user1 = await User.create({ username: 'user1', email: 'user1@example.com', role: 'Regular', password: 'user124'});
      const user2 = await User.create({ username: 'user2', email: 'user2@example.com', role: 'Regular', password: 'user124'});
 
      const group1 = await Group.create({ 
        name: 'Group1', 
        members: [{ email: 'user1@example.com', user: user1._id }, { email: 'user2@example.com', user: user2._id }]});
      group1.save();
 
      const accessToken = jwt.sign({ username: 'user1', email: 'user1@example.com', role: 'Regular' }, process.env.ACCESS_KEY, { expiresIn: '1y' });

     const requestBody = { emails: ["user2@example.com"]};

     const response = await request(app)
      .patch('/api/groups/Group1/remove')
      .set('Cookie', `accessToken=${accessToken}; refreshToken=${accessToken}`)
      .send(requestBody)
      .expect(200)    
      .then((response) => {
    
     expect(response.status).toBe(200);       
     expect(response.body.data.group.name).toBe(group1.name);
     expect(response.body.data.group.members).toEqual( [{"email": "user1@example.com"}]);
     expect(response.body.data.group.members).not.toContain('user2@example.com');

    });

   });


   it('should save the last member of the group and successfully remove other members from the group for an admin user', async () => {

     const admin = await User.create({ username: 'admin', email: 'admin@example.com', role: 'Admin', password: 'admin123'});
     const user1 = await User.create({ username: 'user1', email: 'user1@example.com', role: 'Regular', password: 'user124'});
     const user2 = await User.create({ username: 'user2', email: 'user2@example.com', role: 'Regular', password: 'user124'});
 
     const group1 = await Group.create({ 
      name: 'Group1', 
      members: [{ email: 'user1@example.com', user: user1._id }, { email: 'user2@example.com', user: user2._id }]});
      group1.save();
 
     const accessToken = jwt.sign({ username: 'admin', email: 'admin@example.com', role: 'Admin' }, process.env.ACCESS_KEY, { expiresIn: '1y' });

     const requestBody = { emails: ["user1@example.com","user2@example.com"]};

     const response = await request(app)
     .patch('/api/groups/Group1/pull')
     .set('Cookie', `accessToken=${accessToken}; refreshToken=${accessToken}`)
     .send(requestBody)
     .expect(200)    
     .then((response) => {
    
     expect(response.status).toBe(200);       
     expect(response.body.data.group.name).toBe(group1.name);
     expect(response.body.data.group.members).toEqual( [{"email": "user1@example.com"}]);
     expect(response.body.data.group.members).not.toContain('user2@example.com');

     });

   });


   it('should returns a 400 error if the request body does not contain all the necessary attributes', async () => {

     const admin = await User.create({ username: 'admin', email: 'admin@example.com', role: 'Admin', password: 'admin123'});
     const user1 = await User.create({ username: 'user1', email: 'user1@example.com', role: 'Regular', password: 'user124'});
     const user2 = await User.create({ username: 'user2', email: 'user2@example.com', role: 'Regular', password: 'user124'});
 
     const group1 = await Group.create({ 
      name: 'Group1', 
      members: [{ email: 'user1@example.com', user: user1._id }, { email: 'user2@example.com', user: user2._id }]});
     group1.save();
 
     const accessToken = jwt.sign({ username: 'admin', email: 'admin@example.com', role: 'Admin' }, process.env.ACCESS_KEY, { expiresIn: '1y' });

     const requestBody = {};

     const response = await request(app)
     .patch('/api/groups/Group1/pull')
     .set('Cookie', `accessToken=${accessToken}; refreshToken=${accessToken}`)
     .send(requestBody)
     .expect(400)    
     .then((response) => {
    
      expect(response.status).toBe(400); 
      expect(response.body.error).toBe("request body does not contain all the necessary attributes")      
  
     });

   });


   it('should returns a 400 error if the group name passed as a route parameter does not represent a group in the database', async () => {

      const admin = await User.create({ username: 'admin', email: 'admin@example.com', role: 'Admin', password: 'admin123'});
     const user1 = await User.create({ username: 'user1', email: 'user1@example.com', role: 'Regular', password: 'user124'});
     const user2 = await User.create({ username: 'user2', email: 'user2@example.com', role: 'Regular', password: 'user124'});

     const accessToken = jwt.sign({ username: 'admin', email: 'admin@example.com', role: 'Admin' }, process.env.ACCESS_KEY, { expiresIn: '1y' });

     const requestBody = { emails: ["user2@example.com"]};

      const response = await request(app)
      .patch('/api/groups/Group1/pull')
      .set('Cookie', `accessToken=${accessToken}; refreshToken=${accessToken}`)
      .send(requestBody)
      .expect(400)    
      .then((response) => {
    
     expect(response.status).toBe(400);       
     expect(response.body.error).toBe("Group does not exist") 
  
     });

   });


   it('should returns a 400 error if all the provided emails represent users that do not belong to the group or do not exist in the database', async () => {

      const admin = await User.create({ username: 'admin', email: 'admin@example.com', role: 'Admin', password: 'admin123'});
     const user1 = await User.create({ username: 'user1', email: 'user1@example.com', role: 'Regular', password: 'user124'});
     const user2 = await User.create({ username: 'user2', email: 'user2@example.com', role: 'Regular', password: 'user124'});
     const user3 = await User.create({ username: 'user3', email: 'user3@example.com', role: 'Regular', password: 'user127'});
 
     const group1 = await Group.create({ 
      name: 'Group1', 
      members: [{ email: 'user1@example.com', user: user1._id }, { email: 'user2@example.com', user: user2._id }]});
     group1.save();
 
     const accessToken = jwt.sign({ username: 'admin', email: 'admin@example.com', role: 'Admin' }, process.env.ACCESS_KEY, { expiresIn: '1y' });

     const requestBody = { emails: ["user3@example.com", "user4@example.com" ]};

     const response = await request(app)
     .patch('/api/groups/Group1/pull')
     .set('Cookie', `accessToken=${accessToken}; refreshToken=${accessToken}`)
     .send(requestBody)
     .expect(400)    
     .then((response) => {
    
     expect(response.status).toBe(400);       
     expect(response.body.error).toBe("all the `emails` either do not exist or are not in the group") 

     });

   });

   it('should returns a 400 error if at least one of the emails is not in a valid email format', async () => {

     const admin = await User.create({ username: 'admin', email: 'admin@example.com', role: 'Admin', password: 'admin123'});
     const user1 = await User.create({ username: 'user1', email: 'user1@example.com', role: 'Regular', password: 'user124'});
      const user2 = await User.create({ username: 'user2', email: 'user2@example.com', role: 'Regular', password: 'user124'});
 
      const group1 = await Group.create({ 
       name: 'Group1', 
       members: [{ email: 'user1@example.com', user: user1._id }, { email: 'user2@example.com', user: user2._id }]});
      group1.save();
 
     const accessToken = jwt.sign({ username: 'admin', email: 'admin@example.com', role: 'Admin' }, process.env.ACCESS_KEY, { expiresIn: '1y' });

     const requestBody = { emails: ["invalid-format"]};

     const response = await request(app)
      .patch('/api/groups/Group1/pull')
      .set('Cookie', `accessToken=${accessToken}; refreshToken=${accessToken}`)
      .send(requestBody)
      .expect(400)    
      .then((response) => {
    
     expect(response.status).toBe(400); 
     expect(response.body.error).toBe("not all emails have the right format")        
     });

   });


   it('should returns 400 error if at least one of the emails is an empty string', async () => {

     const admin = await User.create({ username: 'admin', email: 'admin@example.com', role: 'Admin', password: 'admin123'});
     const user1 = await User.create({ username: 'user1', email: 'user1@example.com', role: 'Regular', password: 'user124'});
     const user2 = await User.create({ username: 'user2', email: 'user2@example.com', role: 'Regular', password: 'user124'});
 
     const group1 = await Group.create({ 
       name: 'Group1', 
       members: [{ email: 'user1@example.com', user: user1._id }, { email: 'user2@example.com', user: user2._id }]});
       group1.save();
 
     const accessToken = jwt.sign({ username: 'admin', email: 'admin@example.com', role: 'Admin' }, process.env.ACCESS_KEY, { expiresIn: '1y' });

     const requestBody = { emails: [""]};

     const response = await request(app)
      .patch('/api/groups/Group1/pull')
      .set('Cookie', `accessToken=${accessToken}; refreshToken=${accessToken}`)
      .send(requestBody)
      .expect(400)    
      .then((response) => {
    
     expect(response.status).toBe(400);       
     expect(response.body.error).toBe("one or more emails are empty strings")  
  
     });

   });


   it('should returns a 400 error if the group contains only one member before deleting any user', async () => {

     const admin = await User.create({ username: 'admin', email: 'admin@example.com', role: 'Admin', password: 'admin123'});
     const user1 = await User.create({ username: 'user1', email: 'user1@example.com', role: 'Regular', password: 'user124'});

     const group1 = await Group.create({ 
      name: 'Group1', 
      members: [{ email: 'user1@example.com', user: user1._id }]});
     group1.save();
 
     const accessToken = jwt.sign({ username: 'admin', email: 'admin@example.com', role: 'Admin' }, process.env.ACCESS_KEY, { expiresIn: '1y' });

     const requestBody = { emails: ["user1@example.com"]};

     const response = await request(app)
      .patch('/api/groups/Group1/pull')
      .set('Cookie', `accessToken=${accessToken}; refreshToken=${accessToken}`)
      .send(requestBody)
      .expect(400)    
      .then((response) => {
    
     expect(response.status).toBe(400);       
     expect(response.body.error).toBe("Can't remove members from a group containing only one member") 

     });

   });


   it('should return a 401 error if called by an authenticated user who is not part of the group ', async () => {

      const user3 = await User.create({ username: 'user3', email: 'user3@example.com', role: 'Regular', password: 'user123'});
     const user1 = await User.create({ username: 'user1', email: 'user1@example.com', role: 'Regular', password: 'user124'});
     const user2 = await User.create({ username: 'user2', email: 'user2@example.com', role: 'Regular', password: 'user124'});
 
     const group1 = await Group.create({ 
      name: 'Group1', 
      members: [{ email: 'user1@example.com', user: user1._id }, { email: 'user2@example.com', user: user2._id }]});
     group1.save();
 
      const accessToken = jwt.sign({ username: 'user3', email: 'user3@example.com', role: 'Regular' }, process.env.ACCESS_KEY, { expiresIn: '1y' });

     const requestBody = { emails: ["user2@example.com"]};

     const response = await request(app)
      .patch('/api/groups/Group1/remove')
      .set('Cookie', `accessToken=${accessToken}; refreshToken=${accessToken}`)
      .send(requestBody)
      .expect(401)    
      .then((response) => {
    
     expect(response.status).toBe(401);  
     expect(response.body.error).toBe("User is not a group member")      

     });

   });


  it('should returns a 401 error if called by an authenticated user who is not an admin ', async () => {

      const admin = await User.create({ username: 'user', email: 'user@example.com', role: 'User', password: 'user123'});
     const user1 = await User.create({ username: 'user1', email: 'user1@example.com', role: 'Regular', password: 'user124'});
     const user2 = await User.create({ username: 'user2', email: 'user2@example.com', role: 'Regular', password: 'user124'});
 
     const group1 = await Group.create({ 
       name: 'Group1', 
       members: [{ email: 'user1@example.com', user: user1._id }, { email: 'user2@example.com', user: user2._id }]});
     group1.save();
 
     const accessToken = jwt.sign({ username: 'user', email: 'user@example.com', role: 'Regular' }, process.env.ACCESS_KEY, { expiresIn: '1y' });

     const requestBody = { emails: ["user2@example.com"]};

     const response = await request(app)
     .patch('/api/groups/Group1/pull')
     .set('Cookie', `accessToken=${accessToken}; refreshToken=${accessToken}`)
     .send(requestBody)
     .expect(401)    
     .then((response) => {
    
     expect(response.status).toBe(401); 
     expect(response.body.error).toBe("Mismatched role")       
  
     });

   });


});



describe('deleteUser', () => {

   beforeEach(async () => {
    await Group.deleteMany({});
    await User.deleteMany({});
   });

   it('should delete the user and related data successfully for an admin user', async () => {

     const admin = await User.create({ username: 'admin', email: 'admin@example.com', role: 'Admin', password: 'admin123'});
     const user1 = await User.create({ username: 'user1', email: 'user1@example.com', role: 'Regular', password: 'user124'});
     const user2 = await User.create({ username: 'user2', email: 'user2@example.com', role: 'Regular', password: 'user124'});
 
     await user1.save();
     await user2.save();

     const group1 = await Group.create({ 
      name: 'Group1', 
      members: [{ email: 'user1@example.com', user: user1._id }, { email: 'user2@example.com', user: user2._id }]});
     await group1.save();

     const transaction2 = await transactions.create([{ username: 'user2', amount: 10, type: 'type1', date: new Date() }]);
 
     const accessToken = jwt.sign({ username: 'admin', email: 'admin@example.com', role: 'Admin' }, process.env.ACCESS_KEY, { expiresIn: '1y' });

     const requestBody = {email: "user2@example.com"};

     const response = await request(app)
      .delete('/api/users')   
      .set('Cookie', `accessToken=${accessToken}; refreshToken=${accessToken}`)
      .send(requestBody)    
      .then((response) => {

     expect(response.status).toBe(200);       
     expect(response.body.data.deletedTransactions).toBe(1);
     expect(response.body.data.deletedFromGroup).toBe(true);

     });

   });


   it('should delete the user, related transactions and group successfully for an admin user if group has only that user', async () => {

     const admin = await User.create({ username: 'admin', email: 'admin@example.com', role: 'Admin', password: 'admin123'});
     const user2 = await User.create({ username: 'user2', email: 'user2@example.com', role: 'Regular', password: 'user124'});
     await user2.save();

     const group1 = await Group.create({ 
     name: 'Group1', 
     members: [{ email: 'user2@example.com', user: user2._id }]});
     await group1.save();

     const transaction2 = await transactions.create([{ username: 'user2', amount: 10, type: 'type1', date: new Date() }]);
 
     const accessToken = jwt.sign({ username: 'admin', email: 'admin@example.com', role: 'Admin' }, process.env.ACCESS_KEY, { expiresIn: '1y' });

     const requestBody = {email: "user2@example.com"};

     const response = await request(app)
      .delete('/api/users')   
      .set('Cookie', `accessToken=${accessToken}; refreshToken=${accessToken}`)
      .send(requestBody)    
      .then((response) => {

     expect(response.status).toBe(200);       
     expect(response.body.data.deletedTransactions).toBe(1);
     expect(response.body.data.deletedFromGroup).toBe(true);

     });

   });


   it('should returns a 400 error if the request body does not contain all the necessary attributes', async () => {

     const admin = await User.create({ username: 'admin', email: 'admin@example.com', role: 'Admin', password: 'admin123'});
     const user1 = await User.create({ username: 'user1', email: 'user1@example.com', role: 'Regular', password: 'user124'});
     const user2 = await User.create({ username: 'user2', email: 'user2@example.com', role: 'Regular', password: 'user124'});
 
     await user1.save();
     await user2.save();

     const group1 = await Group.create({ 
     name: 'Group1', 
     members: [{ email: 'user1@example.com', user: user1._id }, { email: 'user2@example.com', user: user2._id }]});
    
     await group1.save();

     const transaction2 = await transactions.create([{ username: 'user2', amount: 10, type: 'type1', date: new Date() }]);
 
     const accessToken = jwt.sign({ username: 'admin', email: 'admin@example.com', role: 'Admin' }, process.env.ACCESS_KEY, { expiresIn: '1y' });

     const requestBody = {};

     const response = await request(app)
      .delete('/api/users') 
      .set('Cookie', `accessToken=${accessToken}; refreshToken=${accessToken}`)
      .send(requestBody)    
      .then((response) => {

     expect(response.status).toBe(400); 
     expect(response.body.error).toBe("the request body does not contain all the necessary attributes")    

     });

   });


   it('should returns a 400 error if the email passed in the request body is an empty string', async () => {

     const admin = await User.create({ username: 'admin', email: 'admin@example.com', role: 'Admin', password: 'admin123'});
     const user1 = await User.create({ username: 'user1', email: 'user1@example.com', role: 'Regular', password: 'user124'});
     const user2 = await User.create({ username: 'user2', email: 'user2@example.com', role: 'Regular', password: 'user124'});
 
     await user1.save();
     await user2.save();

     const group1 = await Group.create({ 
      name: 'Group1', 
      members: [{ email: 'user1@example.com', user: user1._id }, { email: 'user2@example.com', user: user2._id }]});

     await group1.save();

      const transaction2 = await transactions.create([{ username: 'user2', amount: 10, type: 'type1', date: new Date() }]);
 
     const accessToken = jwt.sign({ username: 'admin', email: 'admin@example.com', role: 'Admin' }, process.env.ACCESS_KEY, { expiresIn: '1y' });

     const requestBody = {email: ""};

     const response = await request(app)
      .delete('/api/users') 
      .set('Cookie', `accessToken=${accessToken}; refreshToken=${accessToken}`)
      .send(requestBody)     
      .then((response) => {

     expect(response.status).toBe(400);         
     expect(response.body.error).toBe("email is an empty string")

     });

   });


   it('should returns a 400 error if the email passed in the request body is not in correct email format', async () => {

     const admin = await User.create({ username: 'admin', email: 'admin@example.com', role: 'Admin', password: 'admin123'});
     const user1 = await User.create({ username: 'user1', email: 'user1@example.com', role: 'Regular', password: 'user124'});
     const user2 = await User.create({ username: 'user2', email: 'user2@example.com', role: 'Regular', password: 'user124'});
 
     await user1.save();
     await user2.save();

     const group1 = await Group.create({ 
      name: 'Group1', 
      members: [{ email: 'user1@example.com', user: user1._id }, { email: 'user2@example.com', user: user2._id }]});

     await group1.save();

     const transaction2 = await transactions.create([{ username: 'user2', amount: 10, type: 'type1', date: new Date() }]);
 
     const accessToken = jwt.sign({ username: 'admin', email: 'admin@example.com', role: 'Admin' }, process.env.ACCESS_KEY, { expiresIn: '1y' });

     const requestBody = {email: "invalid-format"};

     const response = await request(app)
      .delete('/api/users') 
      .set('Cookie', `accessToken=${accessToken}; refreshToken=${accessToken}`)
      .send(requestBody)    
      .then((response) => {

     expect(response.status).toBe(400);  
     expect(response.body.error).toBe("email is not in the correct format")     
  
     });

   });


   it('should returns a 400 error if the email passed in the request body does not represent a user in the database', async () => {

     const admin = await User.create({ username: 'admin', email: 'admin@example.com', role: 'Admin', password: 'admin123'});
     const user1 = await User.create({ username: 'user1', email: 'user1@example.com', role: 'Regular', password: 'user124'});
  
     await user1.save();

     const group1 = await Group.create({ 
      name: 'Group1', 
      members: [{ email: 'user1@example.com', user: user1._id }, { email: 'admin@example.com', user: admin._id }]});
     await group1.save();

     const transaction2 = await transactions.create([{ username: 'user2', amount: 10, type: 'type1', date: new Date() }]);
 
     const accessToken = jwt.sign({ username: 'admin', email: 'admin@example.com', role: 'Admin' }, process.env.ACCESS_KEY, { expiresIn: '1y' });

     const requestBody = {email: "user2@example.com"};

     const response = await request(app)
      .delete('/api/users')   
      .set('Cookie', `accessToken=${accessToken}; refreshToken=${accessToken}`)
      .send(requestBody)    
      .then((response) => {

     expect(response.status).toBe(400);  
     expect(response.body.error).toBe("User not found")        
     });

   });


   it('should returns a 400 error if the email passed in the request body represents an admin', async () => {

     const admin = await User.create({ username: 'admin', email: 'admin@example.com', role: 'Admin', password: 'admin123'});
     const user1 = await User.create({ username: 'user1', email: 'user1@example.com', role: 'Regular', password: 'user124'});
     const user2 = await User.create({ username: 'user2', email: 'user2@example.com', role: 'Regular', password: 'user124'});
 
     await user1.save();
     await user2.save();

     const group1 = await Group.create({ 
       name: 'Group1', 
       members: [{ email: 'user1@example.com', user: user1._id }, { email: 'admin@example.com', user: admin._id }]});

      await group1.save();

     const transaction2 = await transactions.create([{ username: 'admin', amount: 10, type: 'type1', date: new Date() }]);
 
     const accessToken = jwt.sign({ username: 'admin', email: 'admin@example.com', role: 'Admin' }, process.env.ACCESS_KEY, { expiresIn: '1y' });

     const requestBody = {email: "admin@example.com"};

     const response = await request(app)
      .delete('/api/users')   
      .set('Cookie', `accessToken=${accessToken}; refreshToken=${accessToken}`)
      .send(requestBody)    
      .then((response) => {

      expect(response.status).toBe(400);   
      expect(response.body.error).toBe("Admins cannot be deleted")       
  
      });

   });


   it('should returns a 401 error if called by an authenticated user who is not an admin', async () => {

     const user = await User.create({ username: 'user', email: 'user@example.com', role: 'Regular', password: 'user123'});
     const user1 = await User.create({ username: 'user1', email: 'user1@example.com', role: 'Regular', password: 'user124'});
     const user2 = await User.create({ username: 'user2', email: 'user2@example.com', role: 'Regular', password: 'user124'});
 
     await user1.save();
     await user2.save();

     const group1 = await Group.create({ 
      name: 'Group1', 
      members: [{ email: 'user1@example.com', user: user1._id }, { email: 'user2@example.com', user: user2._id }]});

      await group1.save();

     const transaction2 = await transactions.create([{ username: 'user2', amount: 10, type: 'type1', date: new Date() }]);
 
     const accessToken = jwt.sign({ username: 'user', email: 'user@example.com', role: 'Regular' }, process.env.ACCESS_KEY, { expiresIn: '1y' });

     const requestBody = {email: "user2@example.com"};

     const response = await request(app)
      .delete('/api/users')   
      .set('Cookie', `accessToken=${accessToken}; refreshToken=${accessToken}`)
      .send(requestBody)    
      .then((response) => {

      expect(response.status).toBe(401); 
      expect(response.body.error).toBe("Mismatched role")         
  
     });

   });

});



describe('deleteGroup', () => {


   beforeEach(async () => {
    await Group.deleteMany({});
    await User.deleteMany({});
   });
   

   it('should delete the group successfully for an admin user', async () => {

      const admin = await User.create({ username: 'admin', email: 'admin@example.com', role: 'Admin', password: 'admin123'});
     const user1 = await User.create({ username: 'user1', email: 'user1@example.com', role: 'Regular', password: 'user124'});
     const user2 = await User.create({ username: 'user2', email: 'user2@example.com', role: 'Regular', password: 'user124'});
 
     await user1.save();
     await user2.save();

     const group1 = await Group.create({ 
      name: 'Group1', 
      members: [{ email: 'user1@example.com', user: user1._id }, { email: 'user2@example.com', user: user2._id }]});

     await group1.save();

     const accessToken = jwt.sign({ username: 'admin', email: 'admin@example.com', role: 'Admin' }, process.env.ACCESS_KEY, { expiresIn: '1y' });

     const requestBody = {name: "Group1"};

     const response = await request(app)
      .delete('/api/groups')   
      .set('Cookie', `accessToken=${accessToken}; refreshToken=${accessToken}`)
      .send(requestBody)    
      .then((response) => {

     expect(response.status).toBe(200);   
     expect(response.body.data.message).toBe('Group deleted correctly');

     });

   });


   it('should return a 400 error if the request body does not contain all the necessary attributes', async () => {

     const admin = await User.create({ username: 'admin', email: 'admin@example.com', role: 'Admin', password: 'admin123'});
     const user1 = await User.create({ username: 'user1', email: 'user1@example.com', role: 'Regular', password: 'user124'});
     const user2 = await User.create({ username: 'user2', email: 'user2@example.com', role: 'Regular', password: 'user124'});
 
     await user1.save();
     await user2.save();

     const group1 = await Group.create({ 
      name: 'Group1', 
      members: [{ email: 'user1@example.com', user: user1._id }, { email: 'user2@example.com', user: user2._id }]});

     await group1.save();

     const accessToken = jwt.sign({ username: 'admin', email: 'admin@example.com', role: 'Admin' }, process.env.ACCESS_KEY, { expiresIn: '1y' });

     const requestBody = {};

     const response = await request(app)
      .delete('/api/groups')   
      .set('Cookie', `accessToken=${accessToken}; refreshToken=${accessToken}`)
      .send(requestBody)    
     .then((response) => {

     expect(response.status).toBe(400);    
     expect(response.body.error).toBe("the request body does not contain all the necessary attributes")

     });

   });


   it('should returns a 400 error if the name passed in the request body is an empty string', async () => {

     const admin = await User.create({ username: 'admin', email: 'admin@example.com', role: 'Admin', password: 'admin123'});
     const user1 = await User.create({ username: 'user1', email: 'user1@example.com', role: 'Regular', password: 'user124'});
     const user2 = await User.create({ username: 'user2', email: 'user2@example.com', role: 'Regular', password: 'user124'});
 
     await user1.save();
     await user2.save();

     const group1 = await Group.create({ 
      name: 'Group1', 
      members: [{ email: 'user1@example.com', user: user1._id }, { email: 'user2@example.com', user: user2._id }]});

     await group1.save();

     const accessToken = jwt.sign({ username: 'admin', email: 'admin@example.com', role: 'Admin' }, process.env.ACCESS_KEY, { expiresIn: '1y' });

     const requestBody = {name: ""};

     const response = await request(app)
      .delete('/api/groups')   
      .set('Cookie', `accessToken=${accessToken}; refreshToken=${accessToken}`)
      .send(requestBody)    
      .then((response) => {

     expect(response.status).toBe(400);    
     expect(response.body.error).toBe("invalid name")

     });

   });


   it('should returns a 400 error if the name passed in the request body does not represent a group in the database', async () => {

     const admin = await User.create({ username: 'admin', email: 'admin@example.com', role: 'Admin', password: 'admin123'});
     const user1 = await User.create({ username: 'user1', email: 'user1@example.com', role: 'Regular', password: 'user124'});
     const user2 = await User.create({ username: 'user2', email: 'user2@example.com', role: 'Regular', password: 'user124'});
 
     await user1.save();
     await user2.save();

     const accessToken = jwt.sign({ username: 'admin', email: 'admin@example.com', role: 'Admin' }, process.env.ACCESS_KEY, { expiresIn: '1y' });

     const requestBody = {name: "Group1"};

     const response = await request(app)
      .delete('/api/groups')   
      .set('Cookie', `accessToken=${accessToken}; refreshToken=${accessToken}`)
      .send(requestBody)    
      .then((response) => {

     expect(response.status).toBe(400);    
     expect(response.body.error).toBe("Group does not exist")

     });

   });


   it('should returns a 401 error if called by an authenticated user who is not an admin ', async () => {

     const user = await User.create({ username: 'user', email: 'user@example.com', role: 'Regular', password: 'user123'});
     const user1 = await User.create({ username: 'user1', email: 'user1@example.com', role: 'Regular', password: 'user124'});
      const user2 = await User.create({ username: 'user2', email: 'user2@example.com', role: 'Regular', password: 'user124'});
 
     await user1.save();
     await user2.save();

     const group1 = await Group.create({ 
      name: 'Group1', 
      members: [{ email: 'user1@example.com', user: user1._id }, { email: 'user2@example.com', user: user2._id }]});

     await group1.save();

     const accessToken = jwt.sign({ username: 'user', email: 'user@example.com', role: 'Regular' }, process.env.ACCESS_KEY, { expiresIn: '1y' });

     const requestBody = {name: "Group1"};

     const response = await request(app)
      .delete('/api/groups')   
      .set('Cookie', `accessToken=${accessToken}; refreshToken=${accessToken}`)
      .send(requestBody)    
      .then((response) => {

     expect(response.status).toBe(401);    
     expect(response.body.error).toBe("Mismatched role")

     });
     
   });


});

