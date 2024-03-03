# Test Report

<The goal of this document is to explain how the application was tested, detailing how the test cases were defined and what they cover>

# Contents

- [Test Report](#test-report)
- [Contents](#contents)
- [Dependency graph](#dependency-graph)
- [Integration approach](#integration-approach)
  - [Controller and Utils](#controller-and-utils)
  - [Auth and Users](#auth-and-users)
    - [Unit testing](#unit-testing)
    - [Integration testing](#integration-testing)
- [Tests](#tests)
  - [Unit tests](#unit-tests)
  - [Integration tests](#integration-tests)
- [Coverage](#coverage)
  - [Coverage of FR](#coverage-of-fr)
  - [Coverage white box](#coverage-white-box)





# Dependency graph 

![Dependency graph](<diagrams/jpg/v2/Dependency graph.jpg>)

# Integration approach

    <Write here the integration sequence you adopted, in general terms (top down, bottom up, mixed) and as sequence
    (ex: step1: unit A, step 2: unit A+B, step 3: unit A+B+C, etc)> 
    <Some steps may  correspond to unit testing (ex step1 in ex above)>
    <One step will  correspond to API testing, or testing unit route.js>
    
    Our approach was to split the code into two approximately equal portions, so that the testing can be done independently and in parallel. Of course this cannot be perfectly done, as there are going to be overlaps. Nonetheless, we managed to split it quite well.
## Controller and Utils 
    The first split was the controller and utils part where a bottom-up integration was implemented.

    There are a couple of helper functions implemented for the controller route, that encapsulate repetitive statements and functionalities. These functions are almost completely covered with the tests written for the non-helper functions, thus separate tests (unit) were not written for these functions.
    For the sake of transparency the discussed functions are the following:
        - composeTxAggregation
        - respondError
        - respondData
        - validationFailed
        - ensureGroupExistsAndVerify
        - canProceedAuthorized

## Auth and Users 
    The second split was the users and auth part where a top-down integration was implemented.

    There are a couple of helper functions implemented for the controller route, that encapsulate repetitive statements and functionalities. These functions are almost completely covered with the tests written for the non-helper functions, thus separate tests (unit) were not written for these functions.
    For the sake of transparency the discussed functions are the following:
        - respondError
        - respondData
        - validationFailed


### Unit testing
    In the first iteration, unit tests were written to test the logic of each function and the correct response for each request.

    The sequence for first split (Controller and Utils) is as follows:
        1. handleDateFilterParams
        2. handleAmountFilterParams
        3. verifyAuth
        4. createCategory
        5. updateCategory
        6. deleteCategory
        7. getCategories
        8. createTransaction 
        9. getAllTransactions
        10. getTransactionsByUser
        11. getTransactionsByUserByCategory
        12. getTransactionsByGroup
        13. getTransactionsByGroupByCategory
        14. deleteTransaction
        15. deleteTransactions

    The sequence for second split (Auth and Users) is as follows:
        1. register
        2. registerAdmin
        3. login
        4. logout
        5. getUsers
        6. getUser
        7. createGroup
        8. getGroups
        9. getGroup
        10.addToGroup
        11.removeFromGroup 
        12.deleteUser
        13.deleteGroup

### Integration testing
    After it was verified, that the mentioned functions work as expected, we verified that they keep the expected behavior even when they are used together, utilizing the database, too. 

    As mentioned earlier a bottom-up approach was implemented for the first split, starting from the function that do not have other function calls inside them. Even though, for these functions the integration and the unit tests are the same, we duplicated the tests to have a full coverage in our test reports.

    The integration sequence for first split was the following:
        1. createCategory
        2. updateCategory
        3. deleteCategory
        4. getCategories
        5. createTransaction 
        6. getAllTransactions
        7. getTransactionsByUser
        8. getTransactionsByUserByCategory
        9. getTransactionsByGroup
        10. getTransactionsByGroupByCategory
        11. deleteTransaction
        12. deleteTransactions 

     As mentioned earlier a top-down approach was implemented, starting from the function with the highest-level and gradually moves down to lower-level components. 
  
    The integration sequence for second split was the following:
        1. register
        2. registerAdmin
        3. login
        4. logout
        5. getUsers
        6. getUser
        7. createGroup
        8. getGroups
        9. getGroup
        10.addToGroup
        11.removeFromGroup 
        12.deleteUser
        13.deleteGroup


# Tests

   <in the table below list the test cases defined. For each test, report the object tested, the test level (API, integration, unit) and the technique used to define the test case  (BB/ eq partitioning, BB/ boundary, WB/ statement coverage, etc)>   <split the table if needed>

## Unit tests

| Test case name | Object(s) tested | Test level | Technique used |
| --                                                                | --             | --   | --                   |
| should return 400 if validation fails                             | register       | Unit | WB / branch coverage |
| should return 400 if user already exists with the same email      | register       | Unit | WB / branch coverage |
| should return 400 if user already exists with the same username   | register       | Unit | WB / branch coverage |
| should create a new user and return success message               | register       | Unit | WB / branch coverage |
| should handle internal server error                               | register       | Unit | WB / branch coverage |
| --                                                                | --             | --   | --                   |
| should return 400 if validation fails                             | registerAdmin  | Unit | WB / branch coverage |
| should return 400 if user already exists with the same email      | registerAdmin  | Unit | WB / branch coverage |
| should return 400 if user already exists with the same username   | registerAdmin  | Unit | WB / branch coverage |
| should create a new user and return success message               | registerAdmin  | Unit | WB / branch coverage |
| should handle internal server error                               | registerAdmin  | Unit | WB / branch coverage |
| --                                                                | --             | --   | --                   |
| should return 400 if validation fails                             | login          | Unit | WB / branch coverage |
| should return 400 if user does not exist                          | login          | Unit | WB / branch coverage |
| should return 400 if wrong credentials are provided               | login          | Unit | WB / branch coverage |
| should login user and return access token and refresh token       | login          | Unit | WB / branch coverage |
| should handle internal server error                               | login          | Unit | WB / branch coverage |
| --                                                                | --             | --   | --                   |
| should return 401 error if authorization fails                    | logout         | Unit | WB / branch coverage |
| should return 400 error if user not found                         | logout         | Unit | WB / branch coverage |
| should logout user and clear tokens                               | logout         | Unit | WB / branch coverage |
| should handle internal server error                               | logout         | Unit | WB / branch coverage |
| --                                                                | --             | --   | --                   |
| --                                                                | --             | --   | --                   |
| should return an array of users if called by an authenticated admin user           | getUsers         | Unit | WB / branch coverage |
| should return a 401 error if called by an authenticated user who is not an admin   | getUsers         | Unit | WB / branch coverage |
| should return a 500 error if there is an internal server error                     | getUsers         | Unit | WB / branch coverage |
| --                                                                                 | --               | --   | --                   |
| should return the user data if called by the same user as the one in the route parameter | getUser | Unit | WB / branch coverage |
| should return the user data if called by an authenticated admin user                     | getUser | Unit | WB / branch coverage |
| should return a 400 error if the username does not represent a user in the database      | getUser | Unit | WB / branch coverage |
| should return a 401 error if called by an authenticated user who is neither the same user as the one in the route parameter nor an admin | getUser | Unit  | WB / branch coverage                  |
| should return a 500 error if there is an internal server error                           | getUser  | Unit | WB / branch coverage                  |
| --     | --       | -- | -- |
| should return a 401 error if called by a user who is not authenticated        | createGroup | Unit | WB / branch coverage |
| should return a 400 error if the request body does not contain all the necessary attributes | createGroup | Unit | WB / branch coverage |
| should return a 400 error if the group name passed in the request body is an empty string   | createGroup | Unit | WB / branch coverage |
| should return a 400 error if the group name passed in the request body represents an already existing group in the database | createGroup | Unit | WB / branch coverage |
| should return 400 if user calling is already in a group                        | createGroup | Unit | WB / branch coverage |
| should return 400 if one or more emails are empty strings                      | createGroup | Unit | WB / branch coverage |
| should return 400 if not all emails have the right format                      | createGroup | Unit | WB / branch coverage |
| should return a 400 error if all the provided emails represent users that are already in a group or do not exist in the database    | createGroup | Unit | WB / branch coverage |
| should create a new group and return the group data, already in group members, and members not found | createGroup | Unit | WB / branch coverage |
| should return a 500 error if there is an internal server error                 | createGroup | Unit | WB / branch coverage |
| --     | -- | -- |-- |
| should return groups if admin authentication is successful     | getGroups | Unit | WB / branch coverage |
| should return an error if admin authentication fails           | getGroups | Unit | WB / branch coverage |
| should return a server error if an exception is thrown         | getGroups | Unit | WB / branch coverage |
| should return a 400 error if the group name passed in the request body represents an already existing group in the database |  getGroups | Unit | WB / branch coverage |
| --     | -- | -- |-- |
| should return the group if the user is authorized (in the group)                 | getGroup | Unit | WB / branch coverage |
| should return the group if the admin is authorized                               | getGroup | Unit | WB / branch coverage |
| should return an error if the group does not exist                               | getGroup | Unit | WB / branch coverage |
| should return a 401 error if the user is neither part of the group nor an admin  | getGroup | Unit | WB / branch coverage |
| should return a server error if an exception is thrown                           | getGroup | Unit | WB / branch coverage |
| --                                                                               | --       | --   |--                    |
| should return 400 if group does not exist                                              | addToGroup | Unit | WB / branch coverage |
| should return 401 error if called by an authenticated user who is not an admin         | addToGroup | Unit | WB / branch coverage |
| should return 401 if called by an authenticated user who is not part of the group      | addToGroup | Unit | WB / branch coverage |
| should return 400 if request body is invalid                                           | addToGroup | Unit | WB / branch coverage |
| should return 400 if one or more emails are an empty string                            | addToGroup | Unit | WB / branch coverage |
| should return 400 if not all emails have the right format                              | addToGroup | Unit | WB / branch coverage |
| should update the group with new members and return the updated group                  | addToGroup | Unit | WB / branch coverage |
| should handle case where all member emails are either already in group or do not exist | addToGroup | Unit | WB / branch coverage |
| should handle server errors and return 500                                             | addToGroup | Unit | WB / branch coverage |
| --     | -- | -- |-- |
| should return 400 if group does not exist                                           | removeFromGroup | Unit | WB / branch coverage |
| should return 400 if group has only one member                                      | removeFromGroup | Unit | WB / branch coverage |
| should return 401 if not authorized as admin                                        | removeFromGroup | Unit | WB / branch coverage |
| should return 401 if not authorized as normal user                                  | removeFromGroup | Unit | WB / branch coverage |
| should return 400 if request body is invalid                                        | removeFromGroup | Unit | WB / branch coverage |
| should return 400 if any email is empty or in the wrong format                      | removeFromGroup | Unit | WB / branch coverage |
| should return 400 if any email does not have the right format                       | removeFromGroup | Unit | WB / branch coverage |
| should return 400 error if all the emails either do not exist or are not in the group | removeFromGroup | Unit | WB / branch coverage |
| should remove members from the group, saved the remaining last member, return the updated group | removeFromGroup | Unit | WB / branch coverage |
| should remove members from the group and return the updated group                   | removeFromGroup | Unit | WB / branch coverage |
| should return 400 if group contains only one member                                 | removeFromGroup | Unit | WB / branch coverage |
| should handle server errors and return 500                                          | removeFromGroup | Unit | WB / branch coverage |
| --     | -- | -- |-- |
| should return 401 if user is not authorized as admin                             | deleteUser | Unit | WB / branch coverage |
| should return 400 if email is missing or not a string                            | deleteUser | Unit | WB / branch coverage |
| should return 400 if email is an empty string                                    | deleteUser | Unit | WB / branch coverage |
| should return 400 if email is not in the correct format                          | deleteUser | Unit | WB / branch coverage |
| should return 400 if user is not found                                           | deleteUser | Unit | WB / branch coverage |
| should return 400 if trying to delete an admin user                              | deleteUser | Unit | WB / branch coverage |
| should delete user and return deleted transaction count and group deletion status | deleteUser | Unit | WB / branch coverage |
| should delete user and return deleted transaction count and group deletion status if last user in group | deleteUser | Unit | WB / branch coverage |
| should handle server errors and return 500                                       | deleteUser | Unit | WB / branch coverage |
| --     | -- | -- |-- |
| should return 401 if user is not authorized as admin                | deleteGroup | Unit | WB / branch coverage |
| should return 400 if name is missing or not a string                | deleteGroup | Unit | WB / branch coverage |
| should return 400 if name is an empty string                        | deleteGroup | Unit | WB / branch coverage |
| should return 400 if group does not exist                           | deleteGroup | Unit | WB / branch coverage |
| should delete group and return success message                      | deleteGroup | Unit | WB / branch coverage |
| should handle server errors and return 500                          | deleteGroup | Unit | WB / branch coverage |
| --                                                    | --                        | --   | --                   |
| --                                                    | --                        | --   | --                   |
| should handle date parameter only                     | handleDateFilterParams    | Unit | WB / branch coverage |
| should throw an error if date is specified with from  | handleDateFilterParams    | Unit | WB / branch coverage |
| should throw an error if date is specified with upTo  | handleDateFilterParams    | Unit | WB / branch coverage |
| should handle from parameter only                     | handleDateFilterParams    | Unit | WB / branch coverage |
| should handle upTo parameter only                     | handleDateFilterParams    | Unit | WB / branch coverage |
| should handle from and upTo parameters                | handleDateFilterParams    | Unit | WB / branch coverage |
| should handle no date parameters                      | handleDateFilterParams    | Unit | WB / branch coverage |
| --                                                    | --                        | --   | --                   |
| should handle min and max parameters                  | handleAmountFilterParams  | Unit | WB / branch coverage |
| should handle min parameter                           | handleAmountFilterParams  | Unit | WB / branch coverage |
| should handle max parameter                           | handleAmountFilterParams  | Unit | WB / branch coverage |
| should handle no parameters                           | handleAmountFilterParams  | Unit | WB / branch coverage |
| --                                                                                    |--          |--    |--                    |
| should return false for missing tokens                                                | verifyAuth | Unit | WB / branch coverage |
| should return false for missing username in accessToken                               | verifyAuth | Unit | WB / branch coverage |
| should return false for missing email in accessToken                                  | verifyAuth | Unit | WB / branch coverage |
| should return false for missing role in accessToken                                   | verifyAuth | Unit | WB / branch coverage |
| should return false for missing username in refreshToken                              | verifyAuth | Unit | WB / branch coverage |
| should return false for missing email in refreshToken                                 | verifyAuth | Unit | WB / branch coverage |
| should return false for missing role in refreshToken                                  | verifyAuth | Unit | WB / branch coverage |
| should return false for mismatched username in simple authType                        | verifyAuth | Unit | WB / branch coverage |
| should return false for mismatched email in simple authType                           | verifyAuth | Unit | WB / branch coverage |
| should return false for mismatched role in simple authType                            | verifyAuth | Unit | WB / branch coverage |
| should return false for mismatched role in accessToken in Admin authType              | verifyAuth | Unit | WB / branch coverage |
| should return false for mismatched role in refreshToken in Admin authType             | verifyAuth | Unit | WB / branch coverage |
| should return false for mismatched role in accessToken in User authType               | verifyAuth | Unit | WB / branch coverage |
| should return false for mismatched role in refreshToken in User authType              | verifyAuth | Unit | WB / branch coverage |
| should return false for mismatched email in Group authType                            | verifyAuth | Unit | WB / branch coverage |
| should return true for matching user in User authType                                 | verifyAuth | Unit | WB / branch coverage |
| should return true for matching role in Admin authType                                | verifyAuth | Unit | WB / branch coverage |
| should return true for matching email in Group authType                               | verifyAuth | Unit | WB / branch coverage |
| should return true and refresh access token if expired                                | verifyAuth | Unit | WB / branch coverage |
| should return false and Perform login again if both tokens are expired                | verifyAuth | Unit | WB / branch coverage |
| should return false and error message if both tokens are expired and cannot refresh   | verifyAuth | Unit | WB / branch coverage |
| should return false and error message if there is a general error                     | verifyAuth | Unit | WB / branch coverage |
| --|--|--|--|
| --|--|--|--|
| should return 401 and error message if authorization fails            | createCategory | Unit | WB / branch coverage | 
| should return 400 and error message if request validation fails       | createCategory | Unit | WB / branch coverage |
| should return 400 and error message if the category already exists    | createCategory | Unit | WB / branch coverage |
| should create a new category and return the saved data                | createCategory | Unit | WB / branch coverage |
| should return an error message if there is an error                   | createCategory | Unit | WB / branch coverage |
| --|--|--|--|
| should update the category and related transactions, and return success message and count | updateCategory | Unit | WB / branch coverage |
| should return an error message if the new category type already exists                    | updateCategory | Unit | WB / branch coverage |
| should return an error message if the category does not exist                             | updateCategory | Unit | WB / branch coverage |
| should return 400 and error message if request validation fails                           | updateCategory | Unit | WB / branch coverage |
| should return 401 and error message if authorization fails                                | updateCategory | Unit | WB / branch coverage |
| should return an error message if there is an error                                       | updateCategory | Unit | WB / branch coverage |
| --|--|--|--|
| should return an error message if there is an error                                             | deleteCategory | Unit | WB / branch coverage |
| should return 401 and error message if authorization fails                                      | deleteCategory | Unit | WB / branch coverage |
| should return 400 and error message if request validation fails                                 | deleteCategory | Unit | WB / branch coverage |
| should return an error message if a category does not exist                                     | deleteCategory | Unit | WB / branch coverage |
| should return an error message if a only one category exists in db                              | deleteCategory | Unit | WB / branch coverage |
| should return 400 error when the oldest category is not found and N > T                         | deleteCategory | Unit | WB / branch coverage |
| should return 200 and data if the oldest category is found and N > T                            | deleteCategory | Unit | WB / branch coverage |
| should return 400 error when the oldest category is not found and N == T                        | deleteCategory | Unit | WB / branch coverage |
| should delete the categories, update related transactions, and return success message and count | deleteCategory | Unit | WB / branch coverage |
| --|--|--|--|
| Should return an error message if there is an error       | getCategories | Unit | WB / branch coverage |
| Should not return anything if not authenticated           | getCategories | Unit | WB / branch coverage |
| Should return empty list, when there are no categories    | getCategories | Unit | WB / branch coverage |
| Should return list of categories, when categories exist   | getCategories | Unit | WB / branch coverage |
| --|--|--|--|
| should return error response if the user is not authorized              | createTransaction | Unit | WB / branch coverage |
| should return 400 and error message if request validation fails         | createTransaction | Unit | WB / branch coverage |
| should return undefined if the category does not exist                  | createTransaction | Unit | WB / branch coverage |
| should return username mismatch if the param and body usernames differ  | createTransaction | Unit | WB / branch coverage |
| should return error response if the username does not exist             | createTransaction | Unit | WB / branch coverage |
| should create a new transaction and return the saved data               | createTransaction | Unit | WB / branch coverage |
| should return an error message if there is an error                     | createTransaction | Unit | WB / branch coverage |
| --|--|--|--|
| should return an error response if there is an error          | getAllTransactions | Unit | WB / branch coverage |
| should return 401 and error message if authorization fails    | getAllTransactions | Unit | WB / branch coverage | 
| should return an empty array if there are no transactions     | getAllTransactions | Unit | WB / branch coverage |
| --|--|--|--|
| should return an error message if admin authentication fails          | getTransactionsByUser | Unit | WB / branch coverage |
| should return an error message if user authentication fails           | getTransactionsByUser | Unit | WB / branch coverage |
| should return an error message if the user does not exist             | getTransactionsByUser | Unit | WB / branch coverage |
| should return transactions for the specified user (called by user)    | getTransactionsByUser | Unit | WB / branch coverage |
| should return transactions for the specified user (called by admin)   | getTransactionsByUser | Unit | WB / branch coverage |
| should return an FilterException if there is a filtering error        | getTransactionsByUser | Unit | WB / branch coverage |
| should return an error message if there is an error                   | getTransactionsByUser | Unit | WB / branch coverage |
| --|--|--|--|
| should return 401 and error message if Admin authentication fails     | getTransactionsByUserByCategory | Unit | WB / branch coverage |
| should return 401 and error message if User authentication fails      | getTransactionsByUserByCategory | Unit | WB / branch coverage |
| should return undefined if the category does not exist                | getTransactionsByUserByCategory | Unit | WB / branch coverage |
| should return an error message if the user does not exist             | getTransactionsByUserByCategory | Unit | WB / branch coverage |
| should return an empty array if no transactions are found             | getTransactionsByUserByCategory | Unit | WB / branch coverage |
| should return transactions for the user for the specified category    | getTransactionsByUserByCategory | Unit | WB / branch coverage |
| should return an error message if there is an error                   | getTransactionsByUserByCategory | Unit | WB / branch coverage |
| --|--|--|--|
| should return 400 and message if group is not verified                    | getTransactionsByGroup | Unit | WB / branch coverage |
| should return 401 and message if group member(s) is/are not authenticated | getTransactionsByGroup | Unit | WB / branch coverage |
| should return empty array if there are no members in the group            | getTransactionsByGroup | Unit | WB / branch coverage |
| should return all transactions in the group                               | getTransactionsByGroup | Unit | WB / branch coverage |
| should return an error message if there is an error                       | getTransactionsByGroup | Unit | WB / branch coverage |
| --|--|--|--|
| should return 400 and message if group is not verified                    | getTransactionsByGroupByCategory | Unit | WB / branch coverage |
| should return 401 and message if group member(s) is/are not authenticated | getTransactionsByGroupByCategory | Unit | WB / branch coverage |
| should return 400 and message if category is not found                    | getTransactionsByGroupByCategory | Unit | WB / branch coverage |
| should return empty array if there are no members in the group            | getTransactionsByGroupByCategory | Unit | WB / branch coverage |
| should return all transactions in the group for the specified category    | getTransactionsByGroupByCategory | Unit | WB / branch coverage |
| should return an error message if there is an error                       | getTransactionsByGroupByCategory | Unit | WB / branch coverage |
| --|--|--|--|
| should return an error message if there is an error                       | deleteTransaction | Unit | WB / branch coverage |
| should return 400 and error message if request validation fails           | deleteTransaction | Unit | WB / branch coverage |
| should return 401 and error message if authorization fails                | deleteTransaction | Unit | WB / branch coverage |
| should return 400 and error message if user is not found                  | deleteTransaction | Unit | WB / branch coverage |
| should return 400 and error message if the transaction does not exist     | deleteTransaction | Unit | WB / branch coverage |
| should return 401 and error message if the usernames do not match         | deleteTransaction | Unit | WB / branch coverage |
| should return successful deletion message if the transaction exists       | deleteTransaction | Unit | WB / branch coverage |
| --|--|--|--|
| should return an error message if there is an error                       | deleteTransactions | Unit | WB / branch coverage |
| should return 401 and error message if authorization fails                | deleteTransactions | Unit | WB / branch coverage |
| should return 400 and error message if request validation fails           | deleteTransactions | Unit | WB / branch coverage |
| should return an error if at least one transaction is not found           | deleteTransactions | Unit | WB / branch coverage |
| should delete the transactions and return a success message               | deleteTransactions | Unit | WB / branch coverage |
| --|--|--|--|


## Integration tests

We separated the Integration and Unit tests to avoid confusion because they have (almost) the same names (to have traceability)

The lowest level integration tests are identical to the ones written for the unit tests as they do not call other functions. We copied to the integration tests nonetheless, to achieve 100% coverage there, too. For this reason these tests are not going to be listed here.

| Test case name | Object(s) tested | Test level | Technique used |
| --|--|--|--|
| should register a new user successfully                                                            | register, validationFailed, RespondData, RespondError | Integration | BB / equivalence classes | 
| should return a 400 error if the request body does not contain all the necessary attributes       | register, validationFailed, RespondData, RespondError | Integration | BB / equivalence classes |
| should return a 400 error if at least one of the parameters in the request body is an empty string | register, validationFailed, RespondData, RespondError| Integration | BB / equivalence classes |
| should return a 400 error if the email in the request body is not in a valid email format          | register, validationFailed, RespondData, RespondError | Integration | BB / equivalence classes |
| should returns a 400 error if the username in the request body identifies an already existing user | register, validationFailed, RespondData, RespondError | Integration | BB / equivalence classes |
| should Returns a 400 error if the email in the request body identifies an already existing user    | register, validationFailed, RespondData, RespondError | Integration | BB / equivalence classes |
| --|--|--|--|
| should register an admin user successfully                                                         | registerAdmin, validationFailed, RespondData, RespondError | Integration | BB / equivalence classes | 
| should return a 400 error if the request body does not contain all the necessary attributes        | registerAdmin, validationFailed, RespondData, RespondError | Integration | BB / equivalence classes |
| should return a 400 error if at least one of the parameters in the request body is an empty string | registerAdmin, validationFailed, RespondData, RespondError | Integration | BB / equivalence classes |
| should return a 400 error if the email in the request body is not in a valid email format          | registerAdmin, validationFailed, RespondData, RespondError | Integration | BB / equivalence classes |
| should returns a 400 error if the username in the request body identifies an already existing user | registerAdmin, validationFailed, RespondData, RespondError | Integration | BB / equivalence classes |
| should Returns a 400 error if the email in the request body identifies an already existing user    | registerAdmin, validationFailed, RespondData, RespondError | Integration | BB / equivalence classes |
| --|--|--|--|
| should login a user and return access and refresh tokens                                             | login, validationFailed, RespondData, RespondError | Integration | BB / equivalence classes | 
| should return a 400 error if the request body does not contain all the necessary attributes          | login, validationFailed, RespondData, RespondError | Integration | BB / equivalence classes |
| should return a 400 error if at least one of the parameters in the request body is an empty string   | login, validationFailed, RespondData, RespondError| Integration | BB / equivalence classes |
| should return a 400 error if the email in the request body is not in a valid email format            | login, validationFailed, RespondData, RespondError | Integration | BB / equivalence classes |
| should returns a 400 error if the email in the request body does not identify a user in the database | login, validationFailed, RespondData, RespondError | Integration | BB / equivalence classes |
| should return a 400 error if the supplied password does not match with the one in the database       | login, validationFailed, RespondData, RespondError | Integration | BB / equivalence classes |
| --|--|--|--|
| should log out a user and clear access and refresh tokens                                                            | logout, verifyAuth, RespondData, RespondError | Integration | BB / equivalence classes | 
| should returns a 400 error if if the refresh token in the requests cookies does not represent a user in the database | logout, verifyAuth, RespondData, RespondError | Integration | BB / equivalence classes |
| --|--|--|--|
| --|--|--|--|
| should return an array of users with their attributes if called by an authenticated admin user | getUsers | Integration | BB / equivalence classes | 
| should return a 401 error if called by an authenticated non-admin user | getUsers, verifyAuth  | WB / branch coverage |
| should return a 401 error if called by an unauthenticated user         | getUsers, verifyAuth | Integration | BB / equivalence classes |
| should return a 500 error if an error occurs while retrieving the list of users | getUsers, verifyAuth | Integration | BB / equivalence classes |
| --|--|--|--|
| should return the user data if called by an authenticated user | getUser, verifyAuth | Integration | BB / equivalence classes | 
| should return the user data if called by an authenticated admin user | getUser, verifyAuth | Integration | BB / equivalence classes |
| should return a 401 error if called by an authenticated user trying to access another user's information | getUser, verifyAuth| Integration | BB / equivalence classes |
| should return a 401 error if called by an unauthenticated user | getUser, verifyAuth | Integration | BB / equivalence classes |
| should return a 400 error if the requested user is not found | getUser, verifyAuth | Integration | BB / equivalence classes |
| should return a 500 error if an error occurs while retrieving the user | getUser, verifyAuth | Integration | BB / equivalence classes |
| --|--|--|--|
| should create a new group successfully | createGroup, verifyAuth | Integration | BB / equivalence classes | 
| should create a new group successfully, without calling user e-mail in the request body | createGroup verifyAuth | Integration | BB / equivalence classes |
| should return a 400 error if the group name is already used | createGroup, verifyAuth| Integration | BB / equivalence classes |
| should return a 400 error if all the member emails either do not exist or are already in a group | createGroup, verifyAuth | Integration | BB / equivalence classes |
| should return a 400 error if the request body validation fails | createGroup, verifyAuth | Integration | BB / equivalence classes |
| should return a 400 error if the user calling is already in a group | createGroup, verifyAuth | Integration | BB / equivalence classes |
| should return a 401 error if the user is not authorized | createGroup, verifyAuth | Integration | BB / equivalence classes |
| should return an error message if there is an error | createGroup, verifyAuth | Integration | BB / equivalence classes |
| --|--|--|--|
| should return an array of groups with their attributes if called by an authenticated admin user | getGroups, verifyAuth | Integration | BB / equivalence classes | 
| should return a 401 error if called by a non-admin user | getGroups verifyAuth | Integration | BB / equivalence classes |
| should return a 500 error if an internal server error occurs | getGroups, verifyAuth| Integration | BB / equivalence classes |
| --|--|--|--|
| should return the group information if called by an authenticated user in the group | getGroup, verifyAuth | Integration | BB / equivalence classes | 
| should returns a 401 error if called by an authenticated user who is neither part of the group nor an admin | getGroup verifyAuth | Integration | BB / equivalence classes |
| should return a 400 error if the group does not exist | getGroup, verifyAuth| Integration | BB / equivalence classes |
| --|--|--|--|
| should add users to the group and return the updated group information | addToGroup, verifyAuth | Integration | BB / equivalence classes | 
| should return a 400 error if the request body does not contain all the necessary attributes | addToGroup, verifyAuth | Integration | BB / equivalence classes |
| should returns a 401 error if called by an authenticated user who is not an admin | addToGroup, verifyAuth| Integration | BB / equivalence classes |
| should returns a 401 error if called by an authenticated user who is not part of the group | addToGroup, verifyAuth | Integration | BB / equivalence classes |
| should return 400 error if the group name passed as a route parameter does not represent a group in the database | addToGroup, verifyAuth | Integration | BB / equivalence classes |
| should return a 400 error if all the provided emails represent users that are already in a group or do not exist in the database |addToGroup, verifyAuth | Integration | BB / equivalence classes |
| should returns a 400 error if at least one of the member emails is not in a valid email format | addToGroup, verifyAuth | Integration | BB / equivalence classes |
| should returns a 400 error if at least one of the member emails is an empty string | addToGroup, verifyAuth | Integration | BB / equivalence classes |
| --|--|--|--|
| should successfully remove members from the group for an admin user | removeFromGroup, verifyAuth | Integration | BB / equivalence classes | 
| should successfully remove members from the group for a group member | removeFromGroup, verifyAuth | Integration | BB / equivalence classes |
| should save the last member of the group and successfully remove other members from the group for an admin user | removeFromGroup, verifyAuth| Integration | BB / equivalence classes |
| should returns a 400 error if the request body does not contain all the necessary attributes | removeFromGroup, verifyAuth | Integration | BB / equivalence classes |
| should returns a 400 error if the group name passed as a route parameter does not represent a group in the database | removeFromGroup, verifyAuth | Integration | BB / equivalence classes |
| should returns a 400 error if all the provided emails represent users that do not belong to the group or do not exist in the database |removeFromGroup, verifyAuth | Integration | BB / equivalence classes |
| should returns a 400 error if at least one of the emails is not in a valid email format | removeFromGroup, verifyAuth | Integration | BB / equivalence classes |
| should returns 400 error if at least one of the emails is an empty string | removeFromGroup, verifyAuth | Integration | BB / equivalence classes |
| should returns a 400 error if the group contains only one member before deleting any user | removeFromGroup, verifyAuth | Integration | BB / equivalence classes |
| should return a 401 error if called by an authenticated user who is not part of the group | removeFromGroup, verifyAuth | Integration | BB / equivalence classes |
| should returns a 401 error if called by an authenticated user who is not an admin | removeFromGroup, verifyAuth | Integration | BB / equivalence classes |
| --|--|--|--|
| should delete the user and related data successfully for an admin user | deleteUser, verifyAuth | Integration | BB / equivalence classes | 
| should delete the user, related transactions and group successfully for an admin user if group has only that user | deleteUser, verifyAuth | Integration | BB / equivalence classes |
| should returns a 400 error if the request body does not contain all the necessary attributes | deleteUser, verifyAuth| Integration | BB / equivalence classes |
| should returns a 400 error if the email passed in the request body is an empty string | deleteUser, verifyAuth | Integration | BB / equivalence classes |
| should returns a 400 error if the email passed in the request body is not in correct email format | deleteUser, verifyAuth | Integration | BB / equivalence classes |
| should returns a 400 error if the email passed in the request body does not represent a user in the database |deleteUser, verifyAuth | Integration | BB / equivalence classes |
| should returns a 400 error if the email passed in the request body represents an admin | deleteUser, verifyAuth | Integration | BB / equivalence classes |
| should returns a 401 error if called by an authenticated user who is not an admin | deleteUser, verifyAuth | Integration | BB / equivalence classes |
| --|--|--|--|
| should delete the group successfully for an admin user | deleteGroup, verifyAuth | Integration | BB / equivalence classes | 
| should return a 400 error if the request body does not contain all the necessary attributes | deleteGroup, verifyAuth | Integration | BB / equivalence classes |
| should returns a 400 error if the name passed in the request body is an empty string | deleteGroup, verifyAuth| Integration | BB / equivalence classes |
| should returns a 400 error if the name passed in the request body does not represent a group in the database | deleteGroup, verifyAuth | Integration | BB / equivalence classes |
| should returns a 401 error if called by an authenticated user who is not an admin | deleteGroup, verifyAuth | Integration | BB / equivalence classes |
| --|--|--|--|
| --|--|--|--|
| should return 401 and error message if user does not have Admin privilege            | createCategory, canProceedAuthorized, validationFailed, RespondData, RespondError | Integration | BB / equivalence classes | 
| should return 400 and error message if request validation fails       | createCategory, canProceedAuthorized, validationFailed, RespondData, RespondError | Integration | BB / equivalence classes |
| should return 400 and error message if the category already exists    | createCategory, canProceedAuthorized, validationFailed, RespondData, RespondError | Integration | BB / equivalence classes |
| should create a new category and return the saved data                | createCategory, canProceedAuthorized, validationFailed, RespondData, RespondError | Integration | BB / equivalence classes |
| should return an error message if there is an error                   | createCategory, canProceedAuthorized, validationFailed, RespondData, RespondError | Integration | BB / equivalence classes |
| --|--|--|--|
| should return 401 and error message if called by a user who is not an Admin                       | updateCategory, canProceedAuthorized, validationFailed, RespondData, RespondError | Integration | BB / equivalence classes |
| it should return 400 and error if the request body does not contain all the necessary parameters  | updateCategory, canProceedAuthorized, validationFailed, RespondData, RespondError | Integration | BB / equivalence classes |
| should return 400 and error message if the type of the new category is the same as one that exists already and that category is not the requested one | updateCategory | Integration | BB / equivalence classes |
| should return an error message if the category does not exist                             | updateCategory, canProceedAuthorized, validationFailed, RespondData, RespondError | Integration | BB / equivalence classes |
| should update the category and related transactions, and return success message and count | updateCategory, canProceedAuthorized, validationFailed, RespondData, RespondError | Integration | BB / equivalence classes |
| should return an error message if there is an error                                       | updateCategory, canProceedAuthorized, validationFailed, RespondData, RespondError | Integration | BB / equivalence classes |
| --|--|--|--|
| should return 401 and error message if called by a user who is not an Admin                                             | deleteCategory, canProceedAuthorized, validationFailed, RespondData, RespondError | Integration | BB / equivalence classes |
| should return 401 and error message if validation fails                     | deleteCategory, canProceedAuthorized, validationFailed, RespondData, RespondError | Integration | BB / equivalence classes |
| should return 400 and error message if not all categories exist in database                                         | deleteCategory, canProceedAuthorized, validationFailed, RespondData, RespondError | Integration | BB / equivalence classes |
| should return 400 and error message if only one category exists in the database                                     | deleteCategory, canProceedAuthorized, validationFailed, RespondData, RespondError | Integration | BB / equivalence classes |
| should return 400 error when the oldest category is not found and N > T                              | deleteCategory, canProceedAuthorized, validationFailed, RespondData, RespondError | Integration | BB / equivalence classes |
| should return 400 error when the oldest category is not found and N == T                         | deleteCategory, canProceedAuthorized, validationFailed, RespondData, RespondError | Integration | BB / equivalence classes |
| should delete all categories                            | deleteCategory, canProceedAuthorized, validationFailed, RespondData, RespondError | Integration | BB / equivalence classes |
| should delete all categories except oldest when trying to delete all categories                        | deleteCategory, canProceedAuthorized, validationFailed, RespondData, RespondError | Integration | BB / equivalence classes |
| should not delete any when passing empty array | deleteCategory, canProceedAuthorized, validationFailed, RespondData, RespondError | Integration | BB / equivalence classes |
| should return an error message if there is an error | deleteCategory, canProceedAuthorized, validationFailed, RespondData, RespondError | Integration | BB / equivalence classes |
| --|--|--|--|
| should return 401 and error message if authorization fails       | getCategories, validationFailed, RespondData, RespondError | Integration | BB / equivalence classes |
| should return list of categories           | getCategories, validationFailed, RespondData, RespondError | Integration | BB / equivalence classes |
| should return an error message if there is an error   | getCategories, validationFailed, RespondData, RespondError | Integration | BB / equivalence classes |
| --|--|--|--|
| should return 401 and error message if authorization fails              | createTransaction, validationFailed, RespondData, RespondError  | Integration | BB / equivalence classes |
| should return 401 and error message if validation fails         | createTransaction, validationFailed, RespondData, RespondError  | Integration | BB / equivalence classes |
| should return 400 and error message if category is not found for the transaction being created                  | createTransaction, validationFailed, RespondData, RespondError  | Integration | BB / equivalence classes |
| should return 400 and error message if there is a username mismatch  | createTransaction, validationFailed, RespondData, RespondError  | Integration | BB / equivalence classes |
| should return 400 and error message if user is not found             | createTransaction, validationFailed, RespondData, RespondError  | Integration | BB / equivalence classes |
| should create a new transaction and return the saved data               | createTransaction, validationFailed, RespondData, RespondError  | Integration | BB / equivalence classes |
| should return an error message if there is an error                     | createTransaction, validationFailed, RespondData, RespondError  | Integration | BB / equivalence classes |
| --|--|--|--|
| should return 401 and error message if authorization fails  | getAllTransactions, canProceedAuthorized, mapTransactionsWithCategories | Integration | BB / equivalence classes |
| Should return empty list, when there are no transactions    | getAllTransactions, canProceedAuthorized, mapTransactionsWithCategories | Integration | BB / equivalence classes | 
| Should return transaction list                              | getAllTransactions, canProceedAuthorized, mapTransactionsWithCategories | Integration | BB / equivalence classes |
| should return an error message if there is an error         | getAllTransactions, canProceedAuthorized, mapTransactionsWithCategories | Integration | BB / equivalence classes |
| --|--|--|--|
| should return 400 and error message if user is not found          | getTransactionsByUser, canProceedAuthorized, handleDateFilterParams, handleAmountFilterParams, composeTxAggregation, mapTransactionsWithCategories, respondError, respondData | Integration | BB / equivalence classes |
| [admin] should return 401 and error message if authentication fails           | getTransactionsByUser, canProceedAuthorized, handleDateFilterParams, handleAmountFilterParams, composeTxAggregation, mapTransactionsWithCategories, respondError, respondData | Integration | BB / equivalence classes |
| [user] should return 401 and error message if authentication fails             | getTransactionsByUser, canProceedAuthorized, handleDateFilterParams, handleAmountFilterParams, composeTxAggregation, mapTransactionsWithCategories, respondError, respondData | Integration | BB / equivalence classes |
| [admin] should fetch all transactions of user    | getTransactionsByUser, canProceedAuthorized, handleDateFilterParams, handleAmountFilterParams, composeTxAggregation, mapTransactionsWithCategories, respondError, respondData | Integration | BB / equivalence classes |
| [user] should fetch all transactions   | getTransactionsByUser, canProceedAuthorized, handleDateFilterParams, handleAmountFilterParams, composeTxAggregation, mapTransactionsWithCategories, respondError, respondData | Integration | BB / equivalence classes |
| [user] should filter transactions by amount        | getTransactionsByUser, canProceedAuthorized, handleDateFilterParams, handleAmountFilterParams, composeTxAggregation, mapTransactionsWithCategories, respondError, respondData | Integration | BB / equivalence classes |
| [user] should filter transactions by date                   | getTransactionsByUser, canProceedAuthorized, handleDateFilterParams, handleAmountFilterParams, composeTxAggregation, mapTransactionsWithCategories, respondError, respondData | Integration | BB / equivalence classes |
| [user] should return 400 when passing both date and from                   | getTransactionsByUser, canProceedAuthorized, handleDateFilterParams, handleAmountFilterParams, composeTxAggregation, mapTransactionsWithCategories, respondError, respondData | Integration | BB / equivalence classes |
| should return an error message if there is an error                   | getTransactionsByUser, canProceedAuthorized, handleDateFilterParams, handleAmountFilterParams, composeTxAggregation, mapTransactionsWithCategories, respondError, respondData | Integration | BB / equivalence classes |
| --|--|--|--|
| should return 400 and error message if category is not found     | getTransactionsByUserByCategory, canProceedAuthorized, respondError, respondData, composeTxAggregation, mapTransactionsWithCategories | Integration | BB / equivalence classes |
| should return 400 and error message if user is not found      | getTransactionsByUserByCategory, canProceedAuthorized, respondError, respondData, composeTxAggregation, mapTransactionsWithCategories | Integration | BB / equivalence classes |
| [admin] should return 401 and error message if authentication fails                | getTransactionsByUserByCategory, canProceedAuthorized, respondError, respondData, composeTxAggregation, mapTransactionsWithCategories | Integration | BB / equivalence classes |
| [user] should return 401 and error message if authentication fails            | getTransactionsByUserByCategory, canProceedAuthorized, respondError, respondData, composeTxAggregation, mapTransactionsWithCategories | Integration | BB / equivalence classes |
| [admin] should fetch all transactions of user by category             | getTransactionsByUserByCategory, canProceedAuthorized, respondError, respondData, composeTxAggregation, mapTransactionsWithCategories | Integration | BB / equivalence classes |
| [user] should fetch all transactions by category    | getTransactionsByUserByCategory, canProceedAuthorized, respondError, respondData, composeTxAggregation, mapTransactionsWithCategories | Integration | BB / equivalence classes |
| should return an error message if there is an error                   | getTransactionsByUserByCategory, canProceedAuthorized, respondError, respondData, composeTxAggregation, mapTransactionsWithCategories | Integration | BB / equivalence classes |
| --|--|--|--|
| should return 400 and message if group is not verified                    | getTransactionsByGroup, ensureGroupExistsAndVerify, respondError, respondData, composeTxAggregation, mapTransactionsWithCategories | Integration | BB / equivalence classes |
| [admin] should return 200 and empty array if group has no members | getTransactionsByGroup, ensureGroupExistsAndVerify, respondError, respondData, composeTxAggregation, mapTransactionsWithCategories | Integration | BB / equivalence classes |
| should return 401 and message if group member(s) is/(are) not verified            | getTransactionsByGroup, ensureGroupExistsAndVerify, respondError, respondData, composeTxAggregation, mapTransactionsWithCategories | Integration | BB / equivalence classes |
| should return 200 and list of transactions of group                               | getTransactionsByGroup, ensureGroupExistsAndVerify, respondError, respondData, composeTxAggregation, mapTransactionsWithCategories | Integration | BB / equivalence classes |
| should return an error message if there is an error                       | getTransactionsByGroup, ensureGroupExistsAndVerify, respondError, respondData, composeTxAggregation, mapTransactionsWithCategories | Integration | BB / equivalence classes |
| --|--|--|
| should return 400 and message if group is not verified                    | getTransactionsByGroupByCategory, ensureGroupExistsAndVerify, respondError, respondData, composeTxAggregation, mapTransactionsWithCategories | Integration | BB / equivalence classes |
| should return 401 and message if group member(s) is/are not verified | getTransactionsByGroupByCategory, ensureGroupExistsAndVerify, respondError, respondData, composeTxAggregation, mapTransactionsWithCategories | Integration | BB / equivalence classes |
| should return 400 and message if category is not found                    | getTransactionsByGroupByCategory, ensureGroupExistsAndVerify, respondError, respondData, composeTxAggregation, mapTransactionsWithCategories | Integration | BB / equivalence classes |
| [admin] should return 200 and empty array if group has no members            | getTransactionsByGroupByCategory, ensureGroupExistsAndVerify, respondError, respondData, composeTxAggregation, mapTransactionsWithCategories | Integration | BB / equivalence classes |
| should return 200 and transaction list of group by category    | getTransactionsByGroupByCategory, ensureGroupExistsAndVerify, respondError, respondData, composeTxAggregation, mapTransactionsWithCategories | Integration | BB / equivalence classes |
| should return an error message if there is an error                       | getTransactionsByGroupByCategory, ensureGroupExistsAndVerify, respondError, respondData, composeTxAggregation, mapTransactionsWithCategories | Integration | BB / equivalence classes |
| --|--|--|--|
| should return 401 and error message if validation fails                       | deleteTransaction, verifyAuth, validationFailed, respondError, respondData | Integration | BB / equivalence classes |
| should return 401 and error message if auth fails          | deleteTransaction, verifyAuth, validationFailed, respondError, respondData | Integration | BB / equivalence classes |
| should return 400 and error message if user is not found                | deleteTransaction, verifyAuth, validationFailed, respondError, respondData | Integration | BB / equivalence classes |
| should return 400 and error message if transaction is not found                  | deleteTransaction, verifyAuth, validationFailed, respondError, respondData | Integration | BB / equivalence classes |
| should return 400 and error message if usernames don't match     | deleteTransaction, verifyAuth, validationFailed, respondError, respondData | Integration | BB / equivalence classes |
| should return 200 and message if transaction was successfully deleted         | deleteTransaction, verifyAuth, validationFailed, respondError, respondData | Integration | BB / equivalence classes |
| should return 500 and error message if there was an error       | deleteTransaction, verifyAuth, validationFailed, respondError, respondData | Integration | BB / equivalence classes |
| --|--|--|--|
| should return 401 and error message if auth fails                       | deleteTransactions, canProceedAuthorized, validationFailed, respondError, respondData  | Integration | BB / equivalence classes |
| should return 401 and error message if validation fails                | deleteTransactions, canProceedAuthorized, validationFailed, respondError, respondData  | Integration | BB / equivalence classes |
| should return 400 and error message if not all transactions are found           | deleteTransactions, canProceedAuthorized, validationFailed, respondError, respondData  | Integration | BB / equivalence classes |
| should return 200 and message if transactions were deleted successfully           | deleteTransactions, canProceedAuthorized, validationFailed, respondError, respondData  | Integration | BB / equivalence classes |
| should return 500 and error message if there was an error              | deleteTransactions, canProceedAuthorized, validationFailed, respondError, respondData  | Integration | BB / equivalence classes |
| --|--|--|--|
# Coverage



## Coverage of FR

<Report in the following table the coverage of  functional requirements (from official requirements) >

Note: for some FRs the unit tests and the integration tests were split into two separate rows for better readability.

| Functional Requirements covered |   Test(s) | 
| ------------------------------- | ----------- | 
|  FR1                            |             | 
| FR11                            | should return 400 if validation fails, should return 400 if user already exists with the same email or same username, should return a 400 error if the request body does not contain all the necessary attributes, should return a 400 error if at least one of the parameters in the request body is an empty string, should return a 400 error if the email in the request body is not in a valid email format |
| FR12                            | should return 400 error message if validation fails, should return a 400 error if user does not exist, should return a 400 error if wrong credentials are provided, should return a 400 error if the request body does not contain all the necessary attributes, should return a 400 error if at least one of the parameters in the request body is an empty string, should return a 400 error  if the email in the request body is not in a valid email format, should return an error message if there is an internal server error |
| FR13                            | should return 401 error if authorization fails, should return 400 error if user not found,  should logout user and clear tokens, should return an error message if there is an internal server error  |
| FR14                            | should return 400 if validation fails, should return 400 if user already exists with the same email, should return 400 if user already exists with the same username, should return a 400 error if the request body does not contain all the necessary attributes, should return a 400 error if at least one of the parameters in the request body is an empty string, should return a 400 error if the email in the request body is not in a valid email format, should return an error message if there is an internal server error  |
| FR15                            | should return a 401 error if called by an authenticated user who is not an admin, should return a 401 error if called by an unauthenticated user, should return an error if an error occurs while retrieving the list of users  |
| FR16                            | should return a 400 error if the username does not represent a user in the database, should return a 401 error if called by an authenticated user who is neither the same user as the one in the route parameter nor an admin, should return an error if there is an internal server error |
| FR17                            | should return 401 error if user is not authorized as admin, should return 400 error if email is missing or not a string, should return error if email is an empty string, should return error if email is not in the correct format, should return error if user is not found, should return error if trying to delete an admin user, should return an error if there is an internal server error  |
| FR2                             |
| FR21                            | should return a 401 error if called by a user who is not authenticated, should return a 400 error if the request body does not contain all the necessary attributes, should return a 400 error if the group name passed in the request body is an empty string, should return 400 if user calling is already in a group, should return 400 if one or more emails are empty strings, should return 400 if not all emails have the right format, should return a 400 error if all the provided emails represent users that are already in a group or do not exist in the database, should return a 400 error if all the member emails either do not exist or are already in a group, should return an error message if there is an error |
| FR22                            | should return groups if admin authentication is successful, should return an error if admin authentication fails, should return a server error if an exception is thrown, should return a 400 error if the group name passed in the request body represents an already existing group in the database, should return an error if an internal server error occurs |
| FR23                            | should return a 401 error if the user is neither part of the group nor an admin, should return a 400 error if the group does not exist, should return a server error if an exception is thrown |
| FR24                            | should return 400 if group does not exist, should return 401 error if called by an authenticated user who is not an admin, should return 401 if called by an authenticated user who is not part of the group, should return 400 if request body is invalid, should return 400 if one or more emails are an empty string, should return 400 if not all emails have the right format, should return 400 error if the group name passed as a route parameter does not represent a group in the database, should return a 400 error if all the provided emails represent users that are already in a group or do not exist in the database, should return an error message if there is an internal server error  |
| FR26                            | should return 400 if group does not exist, should return 400 if group has only one member, should return 401 if not authorized as admin, should return 401 if not authorized as normal user, should return 400 if request body is invalid, should return 400 if any email is empty or in the wrong format, should return 400 if any email does not have the right format, should return 400 error if all the emails either do not exist or are not in the group, should remove members from the group, saved the remaining last member, should return an error message if there is an internal server error  |
| FR28                            | should return 401 if user is not authorized as admin, should return 400 if name is missing or not a string, should return 400 if name is an empty string, should return 400 if group does not exist, should return an error message if there is an internal server error  |                                  
| FR3                              |
| FR31                            | should return error response if the user is not authorized, should return 400 and error message if request validation fails, should return undefined if the category does not exist, should return username mismatch if the param and body usernames differ, should return error response if the username does not exist, should create a new transaction and return the saved data, should return an error message if there is an error |
|                                 | should return 401 and error message if authorization fails, should return 401 and error message if validation fails, should return 400 and error message if category is not found for the transaction being created, should return 400 and error message if there is a username mismatch, should return 400 and error message if user is not found, should create a new transaction and return the saved data, should return an error message if there is an error |
| FR32                            | should return an error response if there is an error, should return 401 and error message if authorization fails, should return an empty array if there are no transactions |
|                                 | should return 401 and error message if authorization fails, Should return empty list, when there are no transactions, Should return transaction list, should return an error message if there is an error |
| FR33                            | should return an error message if admin authentication fails, should return an error message if user authentication fails, should return an error message if the user does not exist, should return transactions for the specified user (called by user), should return transactions for the specified user (called by admin), should return an FilterException if there is a filtering error, should return an error message if there is an error |
|                                 | should return 400 and error message if user is not found, [admin] should return 401 and error message if authentication fails, [user] should return 401 and error message if authentication fails, [admin] should fetch all transactions of user, [user] should fetch all transactions, [user] should filter transactions by amount, [user] should filter transactions by date, [user] should return 400 when passing both date and from, should return an error message if there is an error |
| FR34                            | should return 400 and message if group is not verified, should return 401 and message if group member(s) is/are not authenticated, should return 400 and message if category is not found, should return empty array if there are no members in the group, should return all transactions in the group for the specified category, should return an error message if there is an error |
|                                 | should return 400 and error message if category is not found, should return 400 and error message if user is not found, [admin] should return 401 and error message if authentication fails, [user] should return 401 and error message if authentication fails, [admin] should fetch all transactions of user by category, [user] should fetch all transactions by category, should return an error message if there is an error |
| FR35                            | should return 400 and message if group is not verified, should return 401 and message if group member(s) is/are not authenticated, should return empty array if there are no members in the group, should return all transactions in the group, should return an error message if there is an error |
|                                 | should return 400 and message if group is not verified, [admin] should return 200 and empty array if group has no members, should return 401 and message if group member(s) is/(are) not verified, should return 200 and list of transactions of group, should return an error message if there is an error |
| FR36                            | should return 400 and message if group is not verified, should return 401 and message if group member(s) is/are not authenticated, should return 400 and message if category is not found, should return empty array if there are no members in the group, should return all transactions in the group for the specified category, should return an error message if there is an error |
|                                 | should return 400 and error message if category is not found, should return 400 and error message if user is not found, [admin] should return 401 and error message if authentication fails, [user] should return 401 and error message if authentication fails, [admin] should fetch all transactions of user by category, [user] should fetch all transactions by category, should return an error message if there is an error |
| FR37                            | should return an error message if there is an error, should return 400 and error message if request validation fails, should return 401 and error message if authorization fails, should return 400 and error message if user is not found, should return 400 and error message if the transaction does not exist, should return 401 and error message if the usernames do not match, should return successful deletion message if the transaction exists |
|                                 | should return 401 and error message if validation fails, should return 401 and error message if auth fails, should return 400 and error message if user is not found, should return 400 and error message if transaction is not found , should return 400 and error message if usernames don't match, should return 200 and message if transaction was successfully deleted, should return 500 and error message if there was an error |
| FR38                            | should return an error message if there is an error, should return 401 and error message if authorization fails, should return 400 and error message if request validation fails, should return an error if at least one transaction is not found, should delete the transactions and return a success message |
|                                 | should return 401 and error message if auth fails, should return 401 and error message if validation fails, should return 400 and error message if not all transactions are found, should return 200 and message if transactions were deleted successfully, should return 500 and error message if there was an error |
| FR4                             |
| FR41                            | should return 401 and error message if authorization fails, should return 400 and error message if request validation fails, should return 400 and error message if the category already exists, should create a new category and return the saved data, should return an error message if there is an error |
|                                 | should return 401 and error message if user does not have Admin privilege, should return 400 and error message if request validation fails, should return 400 and error message if the category already exists, should create a new category and return the saved data, should return an error message if there is an error | 
| FR42                            | should update the category and related transactions, and return success message and count, should return an error message if the new category type already exists, should return an error message if the category does not exist, should return 400 and error message if request validation fails, should return 401 and error message if authorization fails, should return an error message if there is an error |
|                                 | should return 401 and error message if called by a user who is not an Admin, it should return 400 and error if the request body does not contain all the necessary parameters, should return 400 and error message if the type of the new category is the same as one that exists already and that category is not the requested one, should return an error message if the category does not exist, should update the category and related transactions, and return success message and count, should return an error message if there is an error |
| FR43                            | should return an error message if there is an error, should return 401 and error message if authorization fails, should return 400 and error message if request validation fails, should return an error message if a category does not exist, should return an error message if a only one category exists in db, should return 400 error when the oldest category is not found and N > T, should return 200 and data if the oldest category is found and N > T, should return 400 error when the oldest category is not found and N == T, should delete the categories, update related transactions, and return success message and count |
|                                 | should return 401 and error message if called by a user who is not an Admin, should return 401 and error message if validation fails, should return 400 and error message if not all categories exist in database, should return 400 and error message if only one category exists in the database, should return 400 error when the oldest category is not found and N > T, should return 400 error when the oldest category is not found and N == T, should delete all categories , should delete all categories except oldest when trying to delete all categories, should not delete any when passing empty array, should return an error message if there is an error |
| FR44                            | Should return an error message if there is an error, Should not return anything if not authenticated, Should return empty list, when there are no categories, Should return list of categories, when categories exist |
|                                 | should return 401 and error message if authorization fails, should return list of categories, should return an error message if there is an error |


## Coverage white box

Report here the screenshot of coverage values obtained with jest-- coverage 


![Test coverage](images/test%20coverage.jpg)



