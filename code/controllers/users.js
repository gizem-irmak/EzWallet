import jwt from 'jsonwebtoken';
import { Group, User } from "../models/User.js";
import { transactions } from "../models/model.js";
import { verifyAuth } from "./utils.js";


/**
- Request Parameters: None
- Request Body Content: None
- Response `data` Content: An array of objects, each one having attributes `username`, `email` and `role`
  - Example: `res.status(200).json({data: [{username: "Mario", email: "mario.red@email.com"}, {username: "Luigi", email: "luigi.red@email.com"}, {username: "admin", email: "admin@email.com"} ], refreshedTokenMessage: res.locals.refreshedTokenMessage})`
- Returns a 401 error if called by an authenticated user who is not an admin (authType = Admin) [done]
 */
export const getUsers = async (req, res) => {
  // only admin 
  try {
    const adminAuth =  verifyAuth(req, res, {authType: "Admin"});
    if(!adminAuth.authorized){
      return  res.status(401).json({ error: adminAuth.cause });
    }

    const users = await User.find() ;
    const filteredUsers = users.map(user => ({username: user.username, email: user.email, role: user.role}));
    res.status(200).json({
      data : filteredUsers,
      message: res.locals.refreshedTokenMessage
    });
  } catch (err) {
      res.status(500).json({error : err.message});
    }
  } 
    


/**
 - Request Parameters: A string equal to the `username` of the involved user
  - Example: `/api/users/Mario`
- Request Body Content: None
- Response `data` Content: An object having attributes `username`, `email` and `role`.
  - Example: `res.status(200).json({data: {username: "Mario", email: "mario.red@email.com", role: "Regular"}, refreshedTokenMessage: res.locals.refreshedTokenMessage})`
- Returns a 400 error if the username passed as the route parameter does not represent a user in the database [done]
- Returns a 401 error if called by an authenticated user who is neither the same user as the one in the route parameter (authType = User) nor an admin (authType = Admin) [done]
 */
    export const getUser = async (req, res) => {
      try {
        const username = req.params.username
        
        const userAuth =  verifyAuth(req, res, { authType: "User", username: username });
        if(userAuth.authorized){
          // userauth success
        } else {
          const adminAuth = verifyAuth(req, res, {authType: "Admin"});
          if ( adminAuth.authorized){
            //admin auth 
          } else {
            return res.status(401).json({ error: adminAuth.cause }) ;
          }
        }
        // user or admin 

        const user = await User.findOne({ username : username })
        if (!user) return res.status(400).json({ error: "User not found" })

        const filteredUser = { username : user.username, email : user.email, role : user.role}
          
        res.status(200).json({
          data : filteredUser,
          message: res.locals.refreshedTokenMessage
        });

      } catch (err) {
        res.status(500).json({error : err.message});      
      }
  }
  

/**
 - Request Parameters: None
- Request request body Content: An object having a string attribute for the `name` of the group and an array that lists all the `memberEmails`
  - Example: `{name: "Family", memberEmails: ["mario.red@email.com", "luigi.red@email.com"]}`
- Response `data` Content: An object having an attribute `group` (this object must have a string attribute for the `name` of the created group and an array for the `members` of the group), an array that lists the `alreadyInGroup` members (members whose email is already present in a group) and an array that lists the `membersNotFound` (members whose email does not appear in the system)
  - Example: `res.status(200).json({data: {group: {name: "Family", members: [{email: "mario.red@email.com"}, {email: "luigi.red@email.com"}]}, membersNotFound: [], alreadyInGroup: []} refreshedTokenMessage: res.locals.refreshedTokenMessage})`
- If the user who calls the API does not have their email in the list of emails then their email is added to the list of members   [done]
- Returns a 400 error if the request body does not contain all the necessary attributes                                            [done] 
- Returns a 400 error if the group name passed in the request body is an empty string                                              [done] 
- Returns a 400 error if the group name passed in the request body represents an already existing group in the database            [done]
- Returns a 400 error if all the provided emails represent users that are already in a group or do not exist in the database       [done]
- Returns a 400 error if the user who calls the API is already in a group                                                          [done]
- Returns a 400 error if at least one of the member emails is not in a valid email format                                          [done]
- Returns a 400 error if at least one of the member emails is an empty string                                                      [done]
- Returns a 401 error if called by a user who is not authenticated (authType = Simple)                                             [done]
 */
export const createGroup = async (req, res) => {
  //both 
    try {
      
    // check the auth 
      const simpleAuth =  verifyAuth(req, res, {authType: "Simple"})
      if (!simpleAuth.authorized){ 
        return res.status(401).json({ error: simpleAuth.cause }) ;
      } 
    // auth ok 
    // get and check req body 
      const obj = req.body 
      const groupName = obj.name ; 
      const emails = obj.memberEmails ; 

      if (!obj || !Array.isArray(emails) || emails.length === 0 || typeof groupName !== 'string') {
        return res.status(400).json({ error: "request body does not contain all the necessary attributes" });  
      }
      if (groupName.trim() == "") return res.status(400).json({error: "the group name passed in the request body is an empty string"})

      // req body ok 
      const alreadyInGroup = [];
      const membersNotFound = [];
      const members = [] ;

      // check group name 
      const existingGroup = await Group.findOne({ name: groupName });
      if (existingGroup) {
        return res.status(400).json({ error : "Group name already used" });
      }

      // group name ok

      // check if user calling is in the member mails
      const cookie = req.cookies;
      const decodedAccessToken = jwt.verify(cookie.accessToken, process.env.ACCESS_KEY);

      const userCalling = await User.findOne( { username :  decodedAccessToken.username}) ; 

      const userCallingGroup  = await Group.findOne({ members: { $elemMatch: { email: userCalling.email } } }); 
      if(userCallingGroup) return res.status(400).json({error : "User calling already in a group"}) ; 

      if(!emails.includes(userCalling.email)) {
        emails.push(userCalling.email) ; 
      }
      // ready to check 

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/ ;


      for (const e of emails) {
        //check if email is in correct format 
        if( e.trim() === "" )  return  res.status(400).json({error : "one or more emails are empty strings"}) ;

        let test = emailRegex.test(e) ; 

        if (!test) return  res.status(400).json({error : "not all emails have the right format"}) ;
        // email is good 
        

        let user = await User.findOne({ email: e });        
        if (!user) {
          membersNotFound.push(e);          
        } else {
         
        const specGroup = await Group.findOne({ members: { $elemMatch: { email: e } } });       
        if (specGroup) {          
          alreadyInGroup.push(e);          
        } else {          
          members.push({email : e , user : user._id});           
        }
        }
       }

      if( members.length === 1 ){  
        //the only user passing the checkings is the one calling which was added before so in practice all the others are already in a group or non existing
        return res.status(400).json({error : "all the `memberEmails` either do not exist or are already in a group"})
      }
      
      const newGroup = await Group.create({ name : groupName , members : members }) ; 
       
      const filteredGroup = {
        name : newGroup.name,
        members : newGroup.members.map(member =>  {return {email : member.email}} )
      }  
      
      res.status(200).json({ 
        data : { group : filteredGroup, alreadyInGroup : alreadyInGroup, membersNotFound: membersNotFound }, 
        message : res.locals.refreshedTokenMessage 
      })

    } catch (err) {
      res.status(500).json({error : err.message});    
    }
}

/**
 - Request Parameters: None
- Request Body Content: None
- Response `data` Content: An array of objects, each one having a string attribute for the `name` of the group and an array for the `members` of the group
  - Example: `res.status(200).json({data: [{name: "Family", members: [{email: "mario.red@email.com"}, {email: "luigi.red@email.com"}]}] refreshedTokenMessage: res.locals.refreshedTokenMessage})`
- Returns a 401 error if called by an authenticated user who is not an admin (authType = Admin)  [done]
 */
export const getGroups = async (req, res) => {
  //only admin 
  
    try {
      const adminAuth =  verifyAuth(req, res, {authType: "Admin"});
      if (!adminAuth.authorized){
        return res.status(401).json({ error: adminAuth.cause }) ;
      }
      const groups = await Group.find() ;
      const filteredGroups = groups.map( group => {
        return {
          name : group.name ,
          members : group.members.map( member => {return {email : member.email}} )
        } 
      })

      res.status(200).json({
        data : filteredGroups,
        message: res.locals.refreshedTokenMessage
      });

    } catch (err) {

      res.status(500).json({error : err.message});        
    }
  } 
  


/**
 - Request Parameters: A string equal to the `name` of the requested group
  - Example: `/api/groups/Family`
- Request Body Content: None
- Response `data` Content: An object having a string attribute for the `name` of the group and an array for the `members` of the group
  - Example: `res.status(200).json({data: {group: {name: "Family", members: [{email: "mario.red@email.com"}, {email: "luigi.red@email.com"}]}} refreshedTokenMessage: res.locals.refreshedTokenMessage})`
- Returns a 400 error if the group name passed as a route parameter does not represent a group in the database                                  [done]
- Returns a 401 error if called by an authenticated user who is neither part of the group (authType = Group) nor an admin (authType = Admin)    [done] 
 */
export const getGroup = async (req, res) => {

  // admin all, normal user only own group
  try {
      
    const groupName = req.params.name;
    
    const group = await Group.findOne({name : groupName});   
    if (!group){
      return res.status(400).json({error : "Group does not exist"});
    }

    const emails = group.members.map(member => member.email);
    const groupAuth =  verifyAuth(req, res, {authType: "Group", emails })  
    if(groupAuth.authorized){
      // user is in the group 
    } else {
      const adminAuth =  verifyAuth(req, res, {authType: "Admin"});
      if (!adminAuth.authorized){
        return res.status(401).json({ error: adminAuth.cause }) ; 
      }
    }

    const filteredGroup = {
      name  : group.name ,
      members : group.members.map(member =>{return {email : member.email}} )
    }
    res.status(200).json({
      data : filteredGroup,
      message: res.locals.refreshedTokenMessage
    });
  } catch (err) {
    res.status(500).json({error : err.message});  }
}

/**
 - Request Parameters: A string equal to the `name` of the group
  - Example: `api/groups/Family/add` (user route)
  - Example: `api/groups/Family/insert` (admin route)
- Request Body Content: An array of strings containing the `emails` of the members to add to the group
  - Example: `{emails: ["pietro.blue@email.com"]}`
- Response `data` Content: An object having an attribute `group` (this object must have a string attribute for the `name` of the created group and an array for the `members` of the group, this array must include the new members as well as the old ones), an array that lists the `alreadyInGroup` members (members whose email is already present in a group) and an array that lists the `membersNotFound` (members whose email does not appear in the system)
  - Example: `res.status(200).json({data: {group: {name: "Family", members: [{email: "mario.red@email.com"}, {email: "luigi.red@email.com"}, {email: "pietro.blue@email.com"}]}, membersNotFound: [], alreadyInGroup: []} refreshedTokenMessage: res.locals.refreshedTokenMessage})`
- In case any of the following errors apply then no user is added to the group
- Returns a 400 error if the request body does not contain all the necessary attributes                                                           [done]
- Returns a 400 error if the group name passed as a route parameter does not represent a group in the database                                    [done]
- Returns a 400 error if all the provided emails represent users that are already in a group or do not exist in the database                      [done]         
- Returns a 400 error if at least one of the member emails is not in a valid email format                                                         [done]
- Returns a 400 error if at least one of the member emails is an empty string                                                                     [done]
- Returns a 401 error if called by an authenticated user who is not part of the group (authType = Group) if the route is `api/groups/:name/add`   [done]
- Returns a 401 error if called by an authenticated user who is not an admin (authType = Admin) if the route is `api/groups/:name/insert`         [done]
 */
export const addToGroup = async (req, res) => {
  // admin all, normal user only own group
    try {
      const groupName = req.params.name;
      
      const group = await Group.findOne({name : groupName});
      if (!group) 
        return res.status(400).json({error: "Group does not exist"});
      
        // check for auth
      if (/[^\/]+\/insert/.test(req.url)) {    
      // admin 
        const adminAuth =  verifyAuth(req, res, {authType: "Admin"});
        if (!adminAuth.authorized) return res.status(401).json({ error: adminAuth.cause }) ;
      } else {
      // normal user
        const emails = group.members.map(member => member.email);
        const groupAuth =  verifyAuth(req, res, {authType: "Group", emails }) ;
        if(!groupAuth.authorized) return res.status(401).json({ error: groupAuth.cause  }) ;
        }
      
        const emails = req.body.emails;

      if(!Array.isArray(emails) || emails.lenght== 0) return res.status(400).json({ error: "request body does not contain all the necessary attributes" }); 

      // def new empty arrays 
      const alreadyInGroup = [];
      const membersNotFound = [];
      const updatedMembers = [] ;

      // fill the 3 vectors 
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/ ;

      for (const e of emails) {

        //check if email is in correct format 
        if( e.trim() == "" )  return  res.status(400).json({error: "one or more emails are an empty string"}) ;
        let test = emailRegex.test(e) ; 
        if (!test) return  res.status(400).json({error: "not all emails have the right format"}) ;
        // email is good 

        let user = await User.findOne({ email: e });
        if (!user) {
          membersNotFound.push(e);
        } else {
        const inGroup = await Group.findOne({ members: { $elemMatch: { email: user.email } } });
        if (inGroup) {
          alreadyInGroup.push(e);
        } else {
          updatedMembers.push(e); 
        }
        }
      }

      // check for optional behaviour 2

      if( emails.length === (alreadyInGroup.length+membersNotFound.length)){
        return res.status(400).json({error : "all the `emails` either do not exist or are already in a group"})
      }

      // update the specific document 

      const allMembers = [...group.members] ; 
      for (const email of updatedMembers) {
        allMembers.push({email})
      }
      

      const updatedGroup = await Group.findOneAndUpdate( 
        {name : groupName},
        {$set : {members : allMembers}},
        {new : true}
        ) ; 

      // send the response 
      const groupToSend = {
        name : updatedGroup.name, 
        members : updatedGroup.members.map( member=>{return {email : member.email}})
      }

      res.status(200).json({ 
        data : { group : groupToSend, alreadyInGroup : alreadyInGroup, membersNotFound: membersNotFound },
        message : res.locals.refreshedTokenMessage
      })   
    } catch (err) {
      res.status(500).json({error : err.message});  }
}

/**
 - Request Parameters: A string equal to the `name` of the group
  - Example: `api/groups/Family/remove` (user route)
  - Example: `api/groups/Family/pull` (admin route)
- Request Body Content: An array of strings containing the `emails` of the members to remove from the group
  - Example: `{emails: ["pietro.blue@email.com"]}`
- Response `data` Content: An object having an attribute `group` (this object must have a string attribute for the `name` of the created group and an array for the `members` of the group, this array must include only the remaining members), an array that lists the `notInGroup` members (members whose email is not in the group) and an array that lists the `membersNotFound` (members whose email does not appear in the system)
  - Example: `res.status(200).json({data: {group: {name: "Family", members: [{email: "mario.red@email.com"}, {email: "luigi.red@email.com"}]}, membersNotFound: [], notInGroup: []} refreshedTokenMessage: res.locals.refreshedTokenMessage})`
- In case any of the following errors apply then no user is removed from the group
- Returns a 400 error if the request body does not contain all the necessary attributes                                                                 [done]
- Returns a 400 error if the group name passed as a route parameter does not represent a group in the database                                          [done]
- Returns a 400 error if all the provided emails represent users that do not belong to the group or do not exist in the database                        [done]
- Returns a 400 error if at least one of the emails is not in a valid email format                                                                      [done] 
- Returns a 400 error if at least one of the emails is an empty string                                                                                  [done]
- Returns a 400 error if the group contains only one member before deleting any user                                                                    [done]
- Returns a 401 error if called by an authenticated user who is not part of the group (authType = Group) if the route is `api/groups/:name/remove`      [done]
- Returns a 401 error if called by an authenticated user who is not an admin (authType = Admin) if the route is `api/groups/:name/pull`                 [done]
 */
export const removeFromGroup = async (req, res) => {
  // admin all, normal user only own group
  try {

    const groupName = req.params.name;
     // check if group exists 
    const group = await Group.findOne({name : groupName});
    if (!group) {
      return res.status(400).json({error: "Group does not exist"});
    }
    // check if user has only one member 

    if ( group.members.length == 1 ){
     return  res.status(400).json( {error : "Can't remove members from a group containing only one member"})
    }
      // check for auth

    if (/[^\/]+\/pull/.test(req.url)) {    
      // admin 
      const adminAuth =  verifyAuth(req, res, {authType: "Admin"});       
      if (!adminAuth.authorized) return res.status(401).json({ error: adminAuth.cause }) ;
      } else {
       // normal user
       const emails = group.members.map(member => member.email);
       const groupAuth =  verifyAuth(req, res, {authType: "Group", emails }) ;
       if(!groupAuth.authorized) return res.status(401).json({ error: groupAuth.cause }) ;
    }

    const emails = req.body.emails; 

    if( !emails || !Array.isArray(emails) || emails.length == 0 ) return res.status(400).json({ error: "request body does not contain all the necessary attributes" }); 

    const notInGroup = [];
    const membersNotFound = [];
    const toBeRemoved = [];

   

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/ ;

     // fill the 3 vectors 
    for (const e of emails) {
      //check if email is in correct format 
      if( e.trim() == "" )  return  res.status(400).json({error : "one or more emails are empty strings"}) ;
      let test = emailRegex.test(e) ; 
      if (!test) return  res.status(400).json({error : "not all emails have the right format"}) ;
      // email is good 

      let user = await User.findOne({ email: e });
      if (!user) {
        membersNotFound.push(e);
      } else {
      const emailExists = group.members.some(member => member.email === e); 
      if (!emailExists) {
        notInGroup.push(e);
      } else {
        toBeRemoved.push(e)
      }
      }
    }

    // check for optional behaviour 2

    if( emails.length === (notInGroup.length+membersNotFound.length)){
      return res.status(400).json({error : "all the `emails` either do not exist or are not in the group"})
    }

    // update the specific document 
    let  updatedGroup = {} ; 
    if(toBeRemoved.length === group.members.length) {
        // lenght is the same
      const usertoBeSaved = group.members[0]
      updatedGroup = await Group.findOneAndUpdate(                             
        { name : groupName},
        {$set : {members : [usertoBeSaved] }},
        {new : true }
        )
    }else {
      // lenght is not the same
      const updatedMembers = group.members.filter( member => !toBeRemoved.includes(member.email))
      updatedGroup = await Group.findOneAndUpdate(
      { name : groupName},
      {$set : {members : updatedMembers }},
      {new : true }
    ) 
    }
      // send the response 
      const groupToSend = {
        name : updatedGroup.name, 
        members : updatedGroup.members.map( member=> {return {email : member.email}})
      }

    res.status(200).json({ 
      data : {group : groupToSend, notInGroup : notInGroup, membersNotFound: membersNotFound },
      message : res.locals.refreshedTokenMessage
    })   

  } catch (err) {
    res.status(500).json({error : err.message});  }
}

/**
- Request Parameters: None
- Request Body Content: A string equal to the `email` of the user to be deleted
  - Example: `{email: "luigi.red@email.com"}`
- Response `data` Content: An object having an attribute that lists the number of `deletedTransactions` and an attribute that specifies whether the user was also `deletedFromGroup` or not
  - Example: `res.status(200).json({data: {deletedTransaction: 1, deletedFromGroup: true}, refreshedTokenMessage: res.locals.refreshedTokenMessage})`
- If the user is the last user of a group then the group is deleted as well
- Returns a 400 error if the request body does not contain all the necessary attributes                     [done] 
- Returns a 400 error if the email passed in the request body is an empty string                            [done]
- Returns a 400 error if the email passed in the request body is not in correct email format                [done]
- Returns a 400 error if the email passed in the request body does not represent a user in the database     [done]
- Returns a 401 error if called by an authenticated user who is not an admin (authType = Admin)             [done]
 */
export const deleteUser = async (req, res) => {
  // only admin 

    try {
      const adminAuth =  verifyAuth(req, res, {authType: "Admin"});
      if (!adminAuth.authorized){
       return res.status(401).json({ error: adminAuth.cause }) ;      
      }

      const email = req.body.email ;  

      if(typeof email !== 'string') return  res.status(400).json({error : "the request body does not contain all the necessary attributes"}) ;
      

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/ ;
       //check if email is in correct format 
       if( email.trim() == "" )  return  res.status(400).json({error : "email is an empty string"}) ;
       let test = emailRegex.test(email) ; 
       if (!test) return  res.status(400).json({error : "email is not in the correct format"}) ; 
       // email is good 
 
      // find the user 

      const user = await User.findOne( {email : email})
      if(!user){ 
       return res.status(400).json({error: "User not found"});
      }

      if ( user.role === "Admin") {
        return res.status(400).json({error : "Admins cannot be deleted"})
      }
      
      const deletedTransactions = await transactions.deleteMany({username : user.username })

      let deletedFromGroup = false; 
      const userInGroup = await Group.findOne({
        members: {$elemMatch: {email: email}}
      });

      if (userInGroup) {
        //check if last user 
        if (userInGroup.members.length == 1) {
          await Group.deleteOne({ name : userInGroup.name}) ;
          deletedFromGroup = true;
        } else {
        for (let i = 0; i < userInGroup.members.length; i++) {
          if (userInGroup.members[i].email === email) {
            userInGroup.members.splice(i, 1);
            deletedFromGroup = true;
            break;
          }
        }
        await userInGroup.save();
      }
      }
      return res.status(200).json({
        data: {
          deletedTransactions: deletedTransactions.deletedCount,
          deletedFromGroup: deletedFromGroup,
        },
        message : res.locals.refreshedTokenMessage
      });  
    } catch (err) {
      res.status(500).json({error : err.message});    }
}

/**
 - Request Parameters: None
- Request Body Content: A string equal to the `name` of the group to be deleted
  - Example: `{name: "Family"}`
- Response `data` Content: A message confirming successful deletion
  - Example: `res.status(200).json({data: {message: "Group deleted successfully"} , refreshedTokenMessage: res.locals.refreshedTokenMessage})`
- Returns a 400 error if the request body does not contain all the necessary attributes                    [done]
- Returns a 400 error if the name passed in the request body is an empty string                            [done]
- Returns a 400 error if the name passed in the request body does not represent a group in the database    [done]
- Returns a 401 error if called by an authenticated user who is not an admin (authType = Admin)            [done]
 */
export const deleteGroup = async (req, res) => {
  // ONLY ADMIN 

    try {
      
      const adminAuth =  verifyAuth(req, res, {authType: "Admin"});
      if (!adminAuth.authorized){
        return res.status(401).json({ error: adminAuth.cause }) ;
      }

      const name = req.body.name ;
      
      if(typeof name !== 'string') return  res.status(400).json({error : "the request body does not contain all the necessary attributes"}) ;

      if( name.trim() == '') return res.status(400).json({error : "invalid name"})

      const existingGroup = await Group.findOne({name : name}) 
      if (!existingGroup)
       return res.status(400).json({ error : "Group does not exist"});
        
      await Group.deleteOne({name : name })

      res.status(200).json({
        data : {message : "Group deleted correctly"},
        message: res.locals.refreshedTokenMessage
      });

    } catch (err) {
      res.status(500).json({error : err.message});    }
}
