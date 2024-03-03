import { not, pick } from "ramda";
import { categories, transactions } from "../models/model.js";
import { User } from "../models/User.js";
import { respondData, respondError } from "../utils/res.utils.js";
import { composeTxAggregation, ensureGroupExistsAndVerify } from "./controller.service.js";
import { handleDateFilterParams, handleAmountFilterParams, verifyAuth } from "./utils.js";
import { FilterException } from "../utils/exceptions.js";
import { createCategoryDto, createTransactionDto, deleteCategoriesDto, deleteTransactionDto, deleteTransactionsDto, updateCategoryDto, validationFailed } from "../dto/controllers.dto.js";

// doc: https://softeng2023course.slack.com/files/U04RG8EJECU/F059JNMB86Q/api.md?origin_team=T04QWLN6B9D&origin_channel=C04RB3E6ZM1

const mapTransactionsWithCategories = (data) => data.map(v =>
    ({ _id: v._id, username: v.username, amount: v.amount, type: v.type, color: v.categories_info.color, date: v.date })
)

const transactionFieldPick = pick(['username', 'amount', 'type', 'date']);

const canProceedAuthorized = (req, res, info) => {
    const auth = verifyAuth(req, res, info);
    if (!auth.authorized) {
        respondError(res, 401, auth.cause)
        return false;
    }

    return true;
}

/**
 * Create a new category
  - Request Body Content: An object having attributes `type` and `color`
  - Response `data` Content: An object having attributes `type` and `color`
 */
export const createCategory = async (req, res) => {
    try {
        if (!canProceedAuthorized(req, res, { authType: 'Admin' })) return;
        if (await validationFailed(req, res, createCategoryDto)) return respondError(res, 400, 'validation error');

        const { type, color } = req.body;
        const cat = await categories.findOne({ type });
        if (cat) return respondError(res, 400, 'category already exists');

        const new_categories = new categories({ type, color });
        const data = await new_categories.save();
        return respondData(res, data);
    } catch (error) {
        return respondError(res, 500, error.message);
    }
}

/**
 * Edit a category's type or color
  - Request Body Content: An object having attributes `type` and `color` equal to the new values to assign to the category
  - Response `data` Content: An object with parameter `message` that confirms successful editing and a parameter `count` that is equal to the count of transactions whose category was changed with the new type
  - Optional behavior:
    - error 400 returned if the specified category does not exist
    - error 400 is returned if new parameters have invalid values
 */
export const updateCategory = async (req, res) => {
    try {
        if (!canProceedAuthorized(req, res, { authType: 'Admin' })) return;
        if (await validationFailed(req, res, updateCategoryDto)) return respondError(res, 400, 'validation error');

        const { type } = req.params;
        const { type: newType, color } = req.body;

        const category = await categories.findOne({ type });
        if (!category) return respondError(res, 400, 'category not found');
        const alreadyExistingCategory = await categories.findOne({ type: newType });
        if (alreadyExistingCategory) return respondError(res, 400, 'such category already exists');

        // update category
        await categories.updateOne({ type }, { $set: { type: newType, color, } })
        // update related transactions with new type
        const txUpdate = await transactions.updateMany({ type }, { type: newType });

        return respondData(res, {
            message: 'Category edited successfully',
            count: txUpdate.modifiedCount,
        });
    } catch (error) {
        return respondError(res, 500, error.message);
    }
}

/**
 * Delete a category
  - Request Body Content: An array of strings that lists the `types` of the categories to be deleted
  - Response `data` Content: An object with parameter `message` that confirms successful deletion and a parameter `count` that is equal to the count of affected transactions (deleting a category sets all transactions with that category to have `investment` as their new category)
  - Given N = categories in the database and T = categories to delete: [done]
    - If N > T then all transactions with a category to delete must have their category set to the oldest category that is not in T
    - If N = T then the oldest created category cannot be deleted and all transactions must have their category set to that category
  - In case any of the following errors apply then no category is deleted
  - Returns a 400 error if the request body does not contain all the necessary attributes [done]
  - Returns a 400 error if called when there is only one category in the database [done]
  - Returns a 400 error if at least one of the types in the array is an empty string [done]
  - Returns a 400 error if at least one of the types in the array does not represent a category in the database [done]
  - Returns a 401 error if called by an authenticated user who is not an admin (authType = Admin)
 */
export const deleteCategory = async (req, res) => {
    try {
        if (!canProceedAuthorized(req, res, { authType: 'Admin' })) return;
        if (await validationFailed(req, res, deleteCategoriesDto)) return respondError(res, 400, 'validation error');

        const { types } = req.body;

        // make sure all categories are represented in db
        const countInDb = await categories.count({
            type: { $in: types },
        });
        if (countInDb < types.length) return respondError(res, 400, 'not all types exist in database');

        const N = await categories.count({});
        const T = types.length;

        if (N === 1) return respondError(res, 400, 'only one category in db');

        let oldestCatType;

        let catsToDelete;
        if (N > T) {
            // bind transactions of deleted cat's to oldest - delete all types
            catsToDelete = types;
            // and reset to oldest category not in types
            const oldestCatNotTypes = await categories
                .findOne({ type: { $not: { $in: types } } })
                .sort({ createdAt: 1 });
            if (!oldestCatNotTypes) return respondError(res, 400, 'cannot find oldest category');
            oldestCatType = oldestCatNotTypes.type;
        }
        if (N === T) {
            // delete all categories except the oldest one
            const oldestCat = await categories
                .findOne({})
                .sort({ createdAt: 1 });
            if (!oldestCat) return respondError(res, 400, 'cannot find oldest category');
            oldestCatType = oldestCat.type;
            catsToDelete = types.filter(t => t !== oldestCatType);
        }

        // actual deletion
        await categories.deleteMany({
            type: { $in: catsToDelete },
        });
        const updateRes = await transactions.updateMany({ type: { $in: catsToDelete } }, { $set: { type: oldestCatType } })
        const transactionsUpdated = updateRes.modifiedCount;

        return respondData(res, {
            message: 'Success',
            count: transactionsUpdated,
        });
    } catch (error) {
        return respondError(res, 500, error.message);
    }
}

/**
 * Return all the categories
  - Request Body Content: None
  - Response `data` Content: An array of objects, each one having attributes `type` and `color`
  - Optional behavior:
    - empty array is returned if there are no categories
 */
export const getCategories = async (req, res) => {
    try {
        if (!canProceedAuthorized(req, res, { authType: 'Simple' })) return;

        let data = await categories.find({}).sort({ createdAt: 'asc' });
        return respondData(res, data.map(v => ({ type: v.type, color: v.color })));
    } catch (error) {
        return respondError(res, 500, error.message);
    }
}

/**
 * Create a new transaction made by a specific user
  - Request Body Content: An object having attributes `username`, `type` and `amount`
  - Response `data` Content: An object having attributes `username`, `type`, `amount` and `date`
  - Optional behavior:
- Returns a 400 error if the request body does not contain all the necessary attributes [done]
- Returns a 400 error if at least one of the parameters in the request body is an empty string [done]
- Returns a 400 error if the type of category passed in the request body does not represent a category in the database [done]
- Returns a 400 error if the username passed in the request body is not equal to the one passed as a route parameter [done]
- Returns a 400 error if the username passed in the request body does not represent a user in the database [done]
- Returns a 400 error if the username passed as a route parameter does not represent a user in the database [done]
- Returns a 400 error if the amount passed in the request body cannot be parsed as a floating value (negative numbers are accepted) [done]
- Returns a 401 error if called by an authenticated user who is not the same user as the one in the route parameter (authType = User) [done]
 */
export const createTransaction = async (req, res) => {
    try {
        const { username: paramsUsername } = req.params;
        const auth = verifyAuth(req, res, { authType: 'User', username: paramsUsername });
        if (!auth.authorized) return respondError(res, 401, auth.cause);

        if (await validationFailed(req, res, createTransactionDto)) return respondError(res, 400, 'validation error');
        const { username, amount, type } = req.body;

        const category = await categories.findOne({ type });
        if (!category) return respondError(res, 400, 'Category not found');
        if (paramsUsername !== username) return respondError(res, 400, 'usernames mismatch');
        const user = await User.findOne({ username });
        if (!user) return respondError(res, 400, 'user not found');

        const new_transaction = new transactions({ username, amount, type });
        const data = await new_transaction.save();
        return respondData(res, transactionFieldPick(data));
    } catch (error) {
        //console.error('123', error)
        return respondError(res, 500, error.message);
    }
}

/**
 * Return all transactions made by all users
  - Request Body Content: None
  - Response `data` Content: An array of objects, each one having attributes `username`, `type`, `amount`, `date` and `color`
  - Optional behavior:
    - empty array must be returned if there are no transactions
 */
export const getAllTransactions = async (req, res) => {
    try {
        if (!canProceedAuthorized(req, res, { authType: 'Admin' })) return;

        const result = await transactions.aggregate(composeTxAggregation());
        const data = mapTransactionsWithCategories(result);
        return respondData(res, data);
    } catch (error) {
        return respondError(res, 500, error.message);
    }
}

/**
 * Return all transactions made by a specific user
  - Request Body Content: None
  - Response `data` Content: An array of objects, each one having attributes `username`, `type`, `amount`, `date` and `color`
  - Optional behavior:
    - error 400 is returned if the user does not exist
    - empty array is returned if there are no transactions made by the user
    - if there are query parameters and the function has been called by a Regular user then the returned transactions must be filtered according to the query parameters
 */
export const getTransactionsByUser = async (req, res) => {
    try {
        const { username } = req.params;

        let filterQuery = { username: { $eq: username } };
        // Distinction between route accessed by Admins or Regular users for functions that can be called by both
        // and different behaviors and access rights
        if (req.url.indexOf("/transactions/users/") >= 0) {
            // called by admin
            // just return list of transactions
            if (!canProceedAuthorized(req, res, { authType: 'Admin' })) return;
        } else {
            // called by user
            // respect query params and filter by amount/date
            if (!canProceedAuthorized(req, res, { authType: 'User', username })) return;

            filterQuery = { ...filterQuery, ...handleDateFilterParams(req), ...handleAmountFilterParams(req) };
        }

        const user = await User.findOne({ username });
        if (!user) return respondError(res, 400, 'User not found');

        const result = await transactions.aggregate(composeTxAggregation(filterQuery));
        const data = mapTransactionsWithCategories(result);
        return respondData(res, data);
    } catch (error) {
        if (error instanceof FilterException) return respondError(res, 400, error.message);
        return respondError(res, 500, error.message);
    }
}

/**
 * Return all transactions made by a specific user filtered by a specific category
  - Request Body Content: None
  - Response `data` Content: An array of objects, each one having attributes `username`, `type`, `amount`, `date` and `color`, filtered so that `type` is the same for all objects
  - Optional behavior:
    - empty array is returned if there are no transactions made by the user with the specified category
    - error 400 is returned if the user or the category does not exist
 */
export const getTransactionsByUserByCategory = async (req, res) => {
    try {
        const { username, category } = req.params;

        // Distinction between route accessed by Admins or Regular users for functions that can be called by both
        // and different behaviors and access rights
        if (req.url.indexOf("/transactions/users/") >= 0) {
            // called by admin
            if (!canProceedAuthorized(req, res, { authType: 'Admin' })) return;
        } else {
            // called by user
            if (!canProceedAuthorized(req, res, { authType: 'User', username })) return;
        }

        const cat = await categories.findOne({ type: category });
        if (!cat) return respondError(res, 400, 'Category not found');

        const user = await User.findOne({ username });
        if (!user) return respondError(res, 400, 'User not found');

        const filterQuery = { username: { $eq: username }, type: { $eq: category } };

        const result = await transactions.aggregate(composeTxAggregation(filterQuery));
        const data = mapTransactionsWithCategories(result);
        return respondData(res, data);
    } catch (error) {
        return respondError(res, 500, error.message);
    }
}

/**
 * Return all transactions made by members of a specific group
  - Request Body Content: None
  - Response `data` Content: An array of objects, each one having attributes `username`, `type`, `amount`, `date` and `color`
  - Optional behavior:
    - error 400 is returned if the group does not exist
    - empty array must be returned if there are no transactions made by the group
 */
export const getTransactionsByGroup = async (req, res) => {
    try {
        const groupAuthVerified = await ensureGroupExistsAndVerify(req.params.name, req, res);
        if (!groupAuthVerified.verified) {
            if (!groupAuthVerified.auth || groupAuthVerified.auth.authorized) return respondError(res, 400, groupAuthVerified.cause);
            return respondError(res, 401, groupAuthVerified.auth.cause);
        }
        const { group } = groupAuthVerified;

        const userEmails = group.members.map(m => m.email);
        if (!userEmails.length) return respondData(res, []);

        const users = await User.find({ email: { $in: userEmails } });
        const usernames = users.map(u => u.username);
        const result = await transactions.aggregate(composeTxAggregation({ username: { $in: usernames } }));

        return respondData(res, mapTransactionsWithCategories(result));
    } catch (error) {
        return respondError(res, 500, error.message);
    }
}

/**
 * Return all transactions made by members of a specific group filtered by a specific category
  - Request Body Content: None
  - Response `data` Content: An array of objects, each one having attributes `username`, `type`, `amount`, `date` and `color`, filtered so that `type` is the same for all objects.
  - Optional behavior:
    - error 401 is returned if the group or the category does not exist
    - empty array must be returned if there are no transactions made by the group with the specified category
 */
export const getTransactionsByGroupByCategory = async (req, res) => {
    try {
        const groupAuthVerified = await ensureGroupExistsAndVerify(req.params.name, req, res);
        if (!groupAuthVerified.verified) {
            if (!groupAuthVerified.auth || groupAuthVerified.auth.authorized) return respondError(res, 400, groupAuthVerified.cause);
            return respondError(res, 401, groupAuthVerified.auth.cause);
        }

        const { category } = req.params;
        const cat = await categories.findOne({ type: category });
        if (!cat) return respondError(res, 400, 'Category not found');

        const { group } = groupAuthVerified
        const userEmails = group.members.map(m => m.email);
        if (!userEmails.length) return respondData(res, []);
        const users = await User.find({ email: { $in: userEmails } });
        const usernames = users.map(u => u.username);
        const filterQuery = { username: { $in: usernames }, type: { $eq: category } };
        const result = await transactions.aggregate(composeTxAggregation(filterQuery));

        return respondData(res, mapTransactionsWithCategories(result));
    } catch (error) {
        return respondError(res, 500, error.message);
    }
}

/**
 * Delete a transaction made by a specific user
  - Request Body Content: The `_id` of the transaction to be deleted
  - Response `data` Content: A string indicating successful deletion of the transaction
  - Optional behavior:
- Returns a 400 error if the request body does not contain all the necessary attributes [done]
- Returns a 400 error if the username passed as a route parameter does not represent a user in the database [done]
- Returns a 400 error if the `_id` in the request body does not represent a transaction in the database [done]
- Returns a 401 error if called by an authenticated user who is not the same user as the one in the route (authType = User) [done]
 */
export const deleteTransaction = async (req, res) => {
    try {
        const { username } = req.params;
        const auth = verifyAuth(req, res, { authType: 'User', username });
        if (!auth.authorized) return respondError(res, 401, auth.cause);

        if (await validationFailed(req, res, deleteTransactionDto)) return respondError(res, 400, 'validation error');

        const { _id } = req.body;

        const user = await User.findOne({ username });
        if (!user) return respondError(res, 400, 'user not found');

        const tx = await transactions.findById(_id);
        if (!tx) return respondError(res, 400, 'transaction not found');

        if (tx.username !== username) return respondError(res, 400, 'Username mismatch');

        await transactions.deleteOne({ _id });
        return respondData(res, { message: "transaction deleted" });
    } catch (error) {
        return respondError(res, 500, error.message);
    }
}

/**
 * Delete multiple transactions identified by their ids
  - Request Body Content: An array of strings that lists the `_ids` of the transactions to be deleted
  - Response `data` Content: A message confirming successful deletion
  - Optional behavior:
- Returns a 400 error if the request body does not contain all the necessary attributes [done]
- Returns a 400 error if at least one of the ids in the array is an empty string [done]
- Returns a 400 error if at least one of the ids in the array does not represent a transaction in the database [done]
- Returns a 401 error if called by an authenticated user who is not an admin (authType = Admin)
 */
export const deleteTransactions = async (req, res) => {
    try {
        if (!canProceedAuthorized(req, res, { authType: 'Admin' })) return;
        if (await validationFailed(req, res, deleteTransactionsDto)) return respondError(res, 400, 'validation error');

        const { _ids } = req.body;
        const txs = await transactions.find({ _id: { $in: _ids } }) // .lean();
        if (txs.length < _ids.length) return respondError(res, 400, 'some transactions are not found');

        await transactions.deleteMany({ _id: { $in: _ids } });
        return respondData(res, { message: 'transactions deleted' });
    } catch (error) {
        return respondError(res, 500, error.message);
    }
}
