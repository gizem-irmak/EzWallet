import { Group, User } from '../models/User';
import { categories, transactions } from '../models/model';
import { verifyAuth, handleAmountFilterParams, handleDateFilterParams } from '../controllers/utils';
import { getCategories, createCategory, updateCategory, deleteCategory, createTransaction, getAllTransactions, mapTransactionsWithCategories, deleteTransaction, deleteTransactions, canProceedAuthorized, getTransactionsByUser, getTransactionsByUserByCategory, getTransactionsByGroup, getTransactionsByGroupByCategory } from '../controllers/controller';
import { respondError } from '../utils/res.utils';
import { get } from 'mongoose';
import { composeTxAggregation, ensureGroupExistsAndVerify } from '../controllers/controller.service';
import { FilterException } from '../utils/exceptions';
import { omit } from 'ramda';
import { validationFailed } from '../dto/controllers.dto';

jest.mock('../models/model');
jest.mock('../models/User')
jest.mock('../controllers/utils');
jest.mock('../controllers/controller.service');
jest.mock('../dto/controllers.dto')

const resetAllMocks = () => {
    const method = 'mockRestore' // 'mockRestore' | 'mockReset' | 'mockClear';

    Group.findOne[method]();
    User.findOne[method]();
    User.find[method]();
    categories.count[method]();
    categories.findOne[method]();
    categories.updateOne[method]();
    categories.deleteMany[method]();
    transactions[method]();
    transactions.deleteOne[method]();
    transactions.findOne[method]();
    transactions.find[method]();
    transactions.aggregate[method]();
    transactions.prototype.save[method]();
    verifyAuth[method]();
}

beforeEach(() => {
    categories.find.mockClear();
    categories.prototype.save.mockClear();
    transactions.find.mockClear();
    transactions.deleteOne.mockClear();
    transactions.aggregate.mockClear();
    transactions.prototype.save.mockClear();
    jest.clearAllMocks();
});

afterEach(() => {
    jest.clearAllMocks();
});

beforeAll(() => {
    validationFailed.mockReturnValue(false);
})

describe("createCategory", () => {
    beforeEach(resetAllMocks);
    const mockReq = {
        body: {
            type: 'category1',
            color: 'red',
        },
    };
    const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        locals: {}
    };

    const mockSavedData = {
        type: 'category1',
        color: 'red',
    };

    it('should return 401 and error message if authorization fails', async () => {
        const authErrorMsg = 'Mismatched role'
        mockRes.locals.message = authErrorMsg

        verifyAuth.mockImplementationOnce(() => ({ authorized: false, cause: authErrorMsg }));

        await createCategory(mockReq, mockRes);

        expect(categories).not.toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({ error: authErrorMsg });
    })

    it('should return 400 and error message if request validation fails', async () => {
        const validationErrorMsg = 'validation error'
        mockRes.locals.message = validationErrorMsg
        verifyAuth.mockImplementationOnce(() => ({ authorized: true, }));
        validationFailed.mockReturnValueOnce(true)

        await createCategory(mockReq, mockRes);

        expect(verifyAuth).toHaveBeenCalled();
        expect(validationFailed).toHaveBeenCalled();
        expect(categories).not.toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.locals).toMatchObject({ message: validationErrorMsg });
    })

    it('should return 400 and error message if the category already exists', async () => {
        const authErrorMsg = 'category already exists'
        mockRes.locals.message = authErrorMsg

        verifyAuth.mockImplementationOnce(() => ({ authorized: true, }));
        categories.findOne.mockResolvedValueOnce( mockReq.body.type )

        await createCategory(mockReq, mockRes);

        expect(categories).not.toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({ error: authErrorMsg });
    })

    it('should create a new category and return the saved data', async () => {

        verifyAuth.mockImplementationOnce(() => ({ authorized: true }));
        categories.mockImplementationOnce(() => ({
            save: jest.fn(() => Promise.resolve(mockSavedData)),
        }));

        await createCategory(mockReq, mockRes);

        expect(categories).toHaveBeenCalledWith({
            type: 'category1',
            color: 'red',
        });
        expect(mockRes.json).toHaveBeenCalledWith({ data: mockSavedData });
    });

    it('should return an error message if there is an error', async () => {
        const errorMessage = 'Error creating category';
        mockRes.locals.message = errorMessage

        verifyAuth.mockImplementationOnce(() => ({ authorized: true }));
        categories.mockImplementationOnce(() => ({
            save: jest.fn(() => Promise.reject(new Error(errorMessage))),
        }));

        await createCategory(mockReq, mockRes);

        expect(categories).toHaveBeenCalledWith(mockSavedData);
        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({ error: errorMessage });
    });

})

describe("updateCategory", () => {
    beforeEach(resetAllMocks);

    const mockReq = {
        params: {
            type: 'category1',
        },
        body: {
            type: 'newCategory',
            color: 'blue',
        },
    };
    const mockRes = {
        status: jest.fn(() => mockRes),
        json: jest.fn(),
        locals: {}
    };


    it('should update the category and related transactions, and return success message and count', async () => {
        const mockCategory = { type: 'category1' };
        const mockModifiedCount = 5;
        const mockUpdatedCategory = { type: 'newCategory', color: 'blue' };

        verifyAuth.mockImplementationOnce(() => ({ authorized: true }));
        categories.findOne.mockImplementationOnce(() => Promise.resolve(mockCategory));
        categories.updateOne.mockImplementationOnce(() => Promise.resolve());
        transactions.updateMany.mockImplementationOnce(() => Promise.resolve({ modifiedCount: mockModifiedCount }));

        await updateCategory(mockReq, mockRes);

        expect(categories.findOne).toHaveBeenCalledWith({ type: 'category1' });
        expect(categories.updateOne).toHaveBeenCalledWith({ type: 'category1' }, { $set: { type: 'newCategory', color: 'blue' } });
        expect(transactions.updateMany).toHaveBeenCalledWith({ type: 'category1' }, { type: 'newCategory' });
        expect(mockRes.json).toHaveBeenCalledWith({
            data: {
                message: 'Category edited successfully',
                count: mockModifiedCount,
            },
        });
    });

    it('should return an error message if the new category type already exists', async () => {
        verifyAuth.mockImplementationOnce(() => ({ authorized: true }));
        categories.findOne.mockImplementationOnce(() => Promise.resolve(mockReq.params.type));
        categories.findOne.mockImplementationOnce(() => Promise.resolve(mockReq.body.type));

        await updateCategory(mockReq, mockRes);

        expect(categories.findOne).toHaveBeenCalledWith({ type: 'category1' });
        expect(categories.findOne).toHaveBeenCalledWith({ type: 'newCategory' });
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({ error: 'such category already exists' });
    });

    it('should return an error message if the category does not exist', async () => {
        verifyAuth.mockImplementationOnce(() => ({ authorized: true }));
        categories.findOne.mockImplementationOnce(() => Promise.resolve(null));

        await updateCategory(mockReq, mockRes);

        expect(categories.findOne).toHaveBeenCalledWith({ type: 'category1' });
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({ error: 'category not found' });
    });

    it('should return 400 and error message if request validation fails', async () => {
        const validationErrorMsg = 'validation error'
        mockRes.locals.message = validationErrorMsg
        verifyAuth.mockImplementationOnce(() => ({ authorized: true, }));
        validationFailed.mockReturnValueOnce(true)

        await updateCategory(mockReq, mockRes);
        
        expect(verifyAuth).toHaveBeenCalled();
        expect(validationFailed).toHaveBeenCalled();
        expect(categories).not.toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.locals).toMatchObject({ message: validationErrorMsg });
    })

    it('should return 401 and error message if authorization fails', async () => {
        const authErrorMsg = 'Mismatched role'
        mockRes.locals.message = authErrorMsg

        verifyAuth.mockImplementationOnce(() => ({ authorized: false, cause: authErrorMsg }));

        await updateCategory(mockReq, mockRes);

        expect(categories).not.toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({ error: authErrorMsg });
    })

    it('should return an error message if there is an error', async () => {
        const errorMessage = 'Error updating category';

        const ErrorResp = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                message: errorMessage,
            }
        }
        verifyAuth.mockImplementationOnce(() => ({ authorized: true }));
        categories.findOne.mockImplementationOnce(() => Promise.reject(new Error(errorMessage)));

        await updateCategory(mockReq, ErrorResp);

        expect(categories.findOne).toHaveBeenCalledWith({ type: 'category1' });
        expect(ErrorResp.status).toHaveBeenCalledWith(500);
        expect(ErrorResp.json).toHaveBeenCalledWith({ error: errorMessage });
    });
})


describe("deleteCategory", () => {
    beforeEach(resetAllMocks);

    const typeList = ["category1", "category2"]
    const mockReq = {
        body: { types: typeList }
    };
    const mockRes = {
        status: jest.fn(() => mockRes),
        json: jest.fn(),
        locals: {
            message: ''
        }
    };

    it('should return an error message if there is an error', async () => {
        const errorMessage = 'Error deleting category';
        mockRes.locals.message = errorMessage

        verifyAuth.mockImplementationOnce(() => ({ authorized: true }));
        categories.count.mockImplementationOnce(() => Promise.reject(new Error(errorMessage)));

        await deleteCategory(mockReq, mockRes);

        expect(categories.count).toHaveBeenCalledWith({ type: { $in: typeList, }, });
        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({ error: errorMessage });
    })

    it('should return 401 and error message if authorization fails', async () => {
        const authErrorMsg = 'Mismatched role'
        mockRes.locals.message = authErrorMsg

        verifyAuth.mockImplementationOnce(() => ({ authorized: false, cause: authErrorMsg }));

        await deleteCategory(mockReq, mockRes);

        expect(categories).not.toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({ error: authErrorMsg });
    })

    it('should return 400 and error message if request validation fails', async () => {
        const validationErrorMsg = 'validation error'
        mockRes.locals.message = validationErrorMsg
        verifyAuth.mockImplementationOnce(() => ({ authorized: true, }));
        validationFailed.mockReturnValueOnce(true)

        await deleteCategory(mockReq, mockRes);
        
        expect(verifyAuth).toHaveBeenCalled();
        expect(validationFailed).toHaveBeenCalled();
        expect(categories).not.toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.locals).toMatchObject({ message: validationErrorMsg });
    })

    it('should return an error message if a category does not exist', async () => {
        verifyAuth.mockImplementationOnce(() => ({ authorized: true }));
        categories.count.mockResolvedValueOnce(1);
        categories.count.mockResolvedValueOnce(2);

        await deleteCategory(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({ error: 'not all types exist in database' });
    });

    it('should return an error message if a only one category exists in db', async () => {
        verifyAuth.mockImplementationOnce(() => ({ authorized: true }));
        const typeList = ["category1", ]
        const mockReq = {
            body: { types: typeList }
        };
        const mockRes = {
            status: jest.fn(() => mockRes),
            json: jest.fn(),
            locals: {
                message: ''
            }
        };
        categories.count.mockResolvedValueOnce(1);
        categories.count.mockResolvedValueOnce(1);

        await deleteCategory(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({ error: 'only one category in db' });
    });

    it('should return 400 error when the oldest category is not found and N > T', async () => {
        verifyAuth.mockImplementationOnce(() => ({ authorized: true }));
        categories.count.mockResolvedValueOnce(5);
        categories.count.mockResolvedValueOnce(5);
        categories.findOne.mockImplementationOnce(() => ({ sort: jest.fn(() => Promise.resolve(null)) }));
    
        await deleteCategory(mockReq, mockRes);
    
        expect(categories.count).toHaveBeenCalledTimes(2);
        //expect(categories.findOne).toHaveBeenCalledTimes(2);
        expect(transactions.updateMany).not.toHaveBeenCalled();
        expect(categories.deleteMany).not.toHaveBeenCalled();
        expect(mockRes.json).toHaveBeenCalledWith({ error: 'cannot find oldest category' });
        expect(mockRes.status).toHaveBeenCalledWith(400);

    });

    it('should return 200 and data if the oldest category is found and N > T', async () => {
        const mockModifiedCount = 3
        verifyAuth.mockImplementationOnce(() => ({ authorized: true }));
        categories.count.mockResolvedValueOnce(5);
        categories.count.mockResolvedValueOnce(5);
        categories.findOne.mockImplementationOnce(() => ({ sort: jest.fn(() => Promise.resolve({ type: 'category3' })) }));
        transactions.updateMany.mockImplementationOnce(() => Promise.resolve({ modifiedCount: mockModifiedCount }));
        categories.deleteMany.mockImplementationOnce(() => Promise.resolve());

        await deleteCategory(mockReq, mockRes);
    
        expect(categories.count).toHaveBeenCalledTimes(2);
        //expect(categories.findOne).toHaveBeenCalledTimes(2);
        expect(categories.deleteMany).toHaveBeenCalledWith({ type: { $in: ['category1', 'category2'] }, });
        expect(transactions.updateMany).toHaveBeenCalledWith({ type: { $in: ['category1', 'category2'] } }, { $set: { type: 'category3' } });;
        expect(mockRes.json).toHaveBeenCalledWith({
            data: {
                message: 'Success',
                count: mockModifiedCount,
            }
        });        expect(mockRes.status).toHaveBeenCalledWith(200);

    });

    it('should return 400 error when the oldest category is not found and N == T', async () => {
        verifyAuth.mockImplementationOnce(() => ({ authorized: true }));
        categories.count.mockResolvedValueOnce(2);
        categories.count.mockResolvedValueOnce(2);
        categories.findOne.mockImplementationOnce(() => ({ sort: jest.fn(() => Promise.resolve(null)) }));
    
        await deleteCategory(mockReq, mockRes);
    
        expect(categories.count).toHaveBeenCalledTimes(2);
        //expect(categories.findOne).toHaveBeenCalledTimes(2);
        expect(transactions.updateMany).not.toHaveBeenCalled();
        expect(categories.deleteMany).not.toHaveBeenCalled();
        expect(mockRes.json).toHaveBeenCalledWith({ error: 'cannot find oldest category' });
        expect(mockRes.status).toHaveBeenCalledWith(400);

    });

    it('should delete the categories, update related transactions, and return success message and count', async () => {
        const mockModifiedCount = 5;
        verifyAuth.mockImplementationOnce(() => ({ authorized: true }));
        categories.count.mockResolvedValueOnce(2);
        categories.count.mockResolvedValueOnce(2);
        categories.findOne.mockImplementationOnce(() => ({ sort: jest.fn(() => Promise.resolve({ type: 'category1' })) }));
        categories.deleteMany.mockImplementationOnce(() => Promise.resolve());
        transactions.updateMany.mockImplementationOnce(() => Promise.resolve({ modifiedCount: mockModifiedCount }));

        await deleteCategory(mockReq, mockRes);

        expect(categories.count).toHaveBeenCalledWith({ type: { $in: typeList }, });
        expect(categories.count).toHaveBeenCalledWith({});
        expect(categories.findOne).toHaveBeenCalledWith({});
        expect(categories.deleteMany).toHaveBeenCalledWith({ type: { $in: ['category2'] }, });

        expect(transactions.updateMany).toHaveBeenCalledWith({ type: { $in: ['category2'] } }, { $set: { type: 'category1' } });;
        expect(mockRes.json).toHaveBeenCalledWith({
            data: {
                message: 'Success',
                count: mockModifiedCount,
            }
        });
    });
})

describe("getCategories", () => {
    beforeEach(resetAllMocks);
    const mockReq = {};
    const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        locals: {
            message: '',
        }
    }

    it('Should return an error message if there is an error', async () => {
        const errorMessage = 'Error retrieving category';
        mockRes.locals.message = errorMessage

        verifyAuth.mockImplementationOnce(() => ({ authorized: true }));
        categories.find.mockReturnValueOnce({ sort: jest.fn().mockReturnValue(Promise.reject(new Error(errorMessage))) });

        await getCategories(mockReq, mockRes);

        expect(categories.findOne).not.toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({ error: errorMessage });
    })


    test('Should not return anything if not authenticated', async () => {
        const errorMessage = 'not authenticated'
        mockRes.locals.message = errorMessage

        verifyAuth.mockImplementationOnce(() => ({ authorized: false, cause: errorMessage }));

        await getCategories(mockReq, mockRes)

        expect(categories.find).not.toHaveBeenCalled()
        expect(mockRes.status).toHaveBeenCalledWith(401)
        expect(mockRes.json).toHaveBeenCalledWith({ error: errorMessage })
    });

    test('Should return empty list, when there are no categories', async () => {
        const mockData = [];

        verifyAuth.mockImplementationOnce(() => ({ authorized: true }));
        categories.find.mockReturnValueOnce({ sort: jest.fn().mockReturnValue(Promise.resolve(mockData)) });

        await getCategories(mockReq, mockRes)
        expect(categories.find).toHaveBeenCalled()
        expect(mockRes.json).toHaveBeenCalledWith({ data: mockData })

    });

    test('Should return list of categories, when categories exist', async () => {
        const mockData = [
            { type: 'category1', color: 'red' },
            { type: 'category2', color: 'blue' },
        ];

        verifyAuth.mockImplementationOnce(() => ({ authorized: true }));
        categories.find.mockReturnValueOnce({ sort: jest.fn().mockReturnValue(Promise.resolve(mockData)) });

        await getCategories(mockReq, mockRes)
        expect(categories.find).toHaveBeenCalled()
        expect(mockRes.json).toHaveBeenCalledWith({ data: mockData })

    });
})

describe("createTransaction", () => {
    beforeEach(resetAllMocks);

    const setup = () => {
        const mockReq = {
            params: {
                username: 'user123',
            },
            body: {
                username: 'user123',
                amount: 100,
                type: 'category1',
            },
        };
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                message: '',
            }
        };
        return { mockReq, mockRes };
    }

    it('should return error response if the user is not authorized', async () => {
        const { mockReq, mockRes } = setup();
        const errorMessage = 'not authorized'
        mockRes.locals.message = errorMessage

        verifyAuth.mockImplementationOnce(() => ({ authorized: false, cause: errorMessage }));
        categories.findOne.mockImplementationOnce(() => null);

        await createTransaction(mockReq, mockRes);

        expect(verifyAuth).toHaveBeenCalled()
        expect(categories.findOne).not.toHaveBeenCalled();
        expect(categories).not.toHaveBeenCalled()
        expect(mockRes.status).toHaveBeenCalledWith(401)
        expect(mockRes.json).toHaveBeenCalledWith({ error: errorMessage })
    });

    it('should return 400 and error message if request validation fails', async () => {
        const { mockReq, mockRes } = setup();
        const validationErrorMsg = 'validation error'
        mockRes.locals.message = validationErrorMsg
        verifyAuth.mockImplementationOnce(() => ({ authorized: true, }));
        validationFailed.mockReturnValueOnce(true)

        await createTransaction(mockReq, mockRes);
        
        expect(verifyAuth).toHaveBeenCalled();
        expect(validationFailed).toHaveBeenCalled();
        expect(transactions).not.toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.locals).toMatchObject({ message: validationErrorMsg });
    })

    it('should return undefined if the category does not exist', async () => {
        const { mockReq, mockRes } = setup();
        verifyAuth.mockImplementationOnce(() => ({ authorized: true }));
        User.findOne.mockResolvedValueOnce({ username: 'user123' });
        categories.findOne.mockImplementationOnce(() => null);

        const resp = await createTransaction(mockReq, mockRes);

        expect(verifyAuth).toHaveBeenCalled()
        expect(categories.findOne).toHaveBeenCalled();
        expect(categories).not.toHaveBeenCalled()
        expect(resp).toEqual(undefined)
    });

    it('should return username mismatch if the param and body usernames differ', async () => {
        const { _, mockRes } = setup();
        const mismatchReq = {
            params: {
                username: 'user123',
            },
            body: {
                username: 'user456',
                amount: 100,
                type: 'category1',
            },
        };
        verifyAuth.mockImplementationOnce(() => ({ authorized: true }));
        User.findOne.mockResolvedValueOnce({ username: 'user123' });
        categories.findOne.mockImplementationOnce(() => 'category1');

        await createTransaction(mismatchReq, mockRes);

        expect(verifyAuth).toHaveBeenCalled()
        expect(categories.findOne).toHaveBeenCalled();
        expect(categories).not.toHaveBeenCalled()
        expect(mockRes.status).toHaveBeenCalledWith(400)
        expect(mockRes.json).toHaveBeenCalledWith({error: 'usernames mismatch'})
    });

    it('should return error response if the username does not exist', async () => {
        const { mockReq, mockRes } = setup();
        const errorMessage = 'user not found'
        mockRes.locals.message = errorMessage

        verifyAuth.mockImplementationOnce(() => ({ authorized: true, }));
        categories.findOne.mockImplementationOnce(() => 'category1');
        User.findOne.mockResolvedValueOnce(null);

        await createTransaction(mockReq, mockRes);

        expect(verifyAuth).toHaveBeenCalled()
        expect(categories.findOne).toHaveBeenCalledWith({type: 'category1'})
        expect(transactions).not.toHaveBeenCalled()
        expect(mockRes.status).toHaveBeenCalledWith(400)
        expect(mockRes.json).toHaveBeenCalledWith({ error: errorMessage })
    });

    it('should create a new transaction and return the saved data', async () => {
        const { mockReq, mockRes } = setup();
        const mockSavedData = {
            _id: 'transaction_id',
            username: 'user123',
            amount: 100,
            type: 'category1',
            date: new Date(),
        };

        verifyAuth.mockImplementationOnce(() => ({ authorized: true }));
        User.findOne.mockResolvedValueOnce({ username: 'user123' });
        categories.findOne.mockImplementationOnce(() => 'category1');
        transactions.mockImplementationOnce(() => ({
            save: jest.fn(() => Promise.resolve(mockSavedData)),
        }));

        await createTransaction(mockReq, mockRes);

        expect(verifyAuth).toHaveBeenCalledWith(mockReq, mockRes, { authType: 'User', username: 'user123' });
        expect(categories.findOne).toHaveBeenCalledWith({ type: 'category1' });
        expect(transactions).toHaveBeenCalledWith({
            username: 'user123',
            amount: 100,
            type: 'category1',
        });
        expect(mockRes.json).toHaveBeenCalledWith({
            data: expect.objectContaining(omit(['_id'], mockSavedData)),
        });
    });

    it('should return an error message if there is an error', async () => {
        const { mockReq, mockRes } = setup();
        const errorMessage = 'Error saving transaction';
        mockRes.locals.message = errorMessage

        verifyAuth.mockImplementationOnce(() => ({ authorized: true }));
        User.findOne.mockResolvedValueOnce({ username: 'user123' });
        categories.findOne.mockImplementationOnce(() => 'category1');
        transactions.mockImplementationOnce(() => ({
            save: jest.fn(() => Promise.reject(new Error(errorMessage)))
        }));

        await createTransaction(mockReq, mockRes);

        expect(verifyAuth).toHaveBeenCalledWith(mockReq, mockRes, {
            authType: 'User', username: 'user123'
        });
        expect(categories.findOne).toHaveBeenCalledWith({ type: 'category1' });
        expect(transactions.prototype.save).not.toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({ error: errorMessage });
    })
})

describe("getAllTransactions", () => {

    const mockReq = {};
    const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        locals: {
            message: '',
        }
    };

    it('should return an error response if there is an error', async () => {
        const errorMessage = 'Error retrieving transactions';
        mockRes.locals.message = errorMessage

        verifyAuth.mockImplementationOnce(() => ({ authorized: true }));
        transactions.aggregate.mockImplementationOnce(() => Promise.reject(new Error(errorMessage)));

        await getAllTransactions(mockReq, mockRes);

        expect(transactions.aggregate).toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({ error: errorMessage });

    });

    it('should return 401 and error message if authorization fails', async () => {
        const authErrorMsg = 'Mismatched role'
        mockRes.locals.message = authErrorMsg

        verifyAuth.mockImplementationOnce(() => ({ authorized: false, cause: authErrorMsg }));

        await getAllTransactions(mockReq, mockRes);

        expect(categories).not.toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({ error: authErrorMsg });
    })

    it('should return an empty array if there are no transactions', async () => {
        const mockResult = [];

        verifyAuth.mockImplementationOnce(() => ({ authorized: true }));
        transactions.aggregate.mockResolvedValueOnce(mockResult);

        await getAllTransactions(mockReq, mockRes);

        expect(transactions.aggregate).toHaveBeenCalledWith(composeTxAggregation());
        expect(mockRes.json).toHaveBeenCalledWith({
            data: expect.objectContaining([]),
        });
    });

})

describe("getTransactionsByUser", () => {

    const mockReq = {
        params: {
            username: 'user123',
        },
        url: '',
    };
    const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        locals: {
            message: '',
        }
    };

    it('should return an error message if admin authentication fails', async () => {
        mockReq.url = '/transactions/users/user123'
        const authErrorMsg = 'Mismatched role'
        mockRes.locals.message = authErrorMsg

        verifyAuth.mockImplementationOnce(() => ({ authorized: false, cause: authErrorMsg }));

        await getTransactionsByUser(mockReq, mockRes);

        expect(User.findOne).not.toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({ error: authErrorMsg });


    });

    it('should return an error message if user authentication fails', async () => {
        mockReq.url = ''
        const authErrorMsg = 'Mismatched role'
        mockRes.locals.message = authErrorMsg

        verifyAuth.mockImplementationOnce(() => ({ authorized: false, cause: authErrorMsg }));

        await getTransactionsByUser(mockReq, mockRes);

        expect(User.findOne).not.toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({ error: authErrorMsg });


    });

    it('should return an error message if the user does not exist', async () => {
        const errorMessage = 'User not found';
        mockRes.locals.message = errorMessage

        verifyAuth.mockImplementationOnce(() => ({ authorized: true, }));
        User.findOne.mockImplementationOnce(() => Promise.resolve(null))

        await getTransactionsByUser(mockReq, mockRes);

        expect(User.findOne).toHaveBeenCalledWith({ username: 'user123' });
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({ error: errorMessage });
        expect(transactions.aggregate).not.toHaveBeenCalled();
    });

    it('should return transactions for the specified user (called by user)', async () => {
        mockReq.url = '/users/user123/transactions'
        mockReq.query = {}
        User.findOne.mockImplementationOnce(() => Promise.resolve('user123'))
        verifyAuth.mockImplementationOnce(() => ({ authorized: true }));

        const transaction = {
            _id: 'transaction123',
            username: 'user123',
            amount: 100,
            type: 'category1',
            categories_info: { color: 'blue', },
            date: new Date()
        };
        transactions.aggregate.mockImplementationOnce(() => Promise.resolve([transaction]))

        await getTransactionsByUser(mockReq, mockRes);

        expect(User.findOne).toHaveBeenCalledWith({ username: 'user123' });
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith({
            data: [{
                _id: 'transaction123',
                username: 'user123',
                amount: 100,
                type: 'category1',
                color: 'blue',
                date: transaction.date,
            }]
        });
    });

    //TODO: shall I check with query and not empty params??
    it('should return transactions for the specified user (called by admin)', async () => {
        mockReq.url = '/transactions/users/user123'

        User.findOne.mockImplementationOnce(() => Promise.resolve('user123'))
        verifyAuth.mockImplementationOnce(() => ({ authorized: true }));

        transactions.aggregate.mockImplementationOnce(() => Promise.resolve([]))

        await getTransactionsByUser(mockReq, mockRes);

        expect(User.findOne).toHaveBeenCalledWith({ username: 'user123' });
        expect(transactions.aggregate).toHaveBeenCalledWith(undefined);
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith({ data: [] });
    });

    it('should return an FilterException if there is a filtering error', async () => {
        const filterErrorMessage = 'Invalid filter';
        mockReq.url = '/users/user123/transactions';
        mockRes.locals.message = filterErrorMessage
        User.findOne.mockImplementationOnce(() => Promise.resolve('user123'))
        verifyAuth.mockImplementationOnce(() => ({ authorized: true }));
        handleDateFilterParams.mockImplementationOnce(() => { throw new FilterException(filterErrorMessage) });

        await getTransactionsByUser(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({ error: filterErrorMessage });
    });

    it('should return an error message if there is an error', async () => {
        const errorMessage = 'Database error'
        mockRes.locals.message = errorMessage
        verifyAuth.mockImplementationOnce(() => ({ authorized: true, }));
        User.findOne.mockImplementationOnce(() => Promise.resolve('user123'));
        transactions.aggregate.mockRejectedValueOnce(new Error(errorMessage));

        await getTransactionsByUser(mockReq, mockRes);

        expect(User.findOne).toHaveBeenCalledWith({ username: 'user123' });
        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({ error: errorMessage });
    });
})

describe("getTransactionsByUserByCategory", () => {
    beforeEach(resetAllMocks);

    const setup = () => {
        const mockReq = {
            params: {
                username: 'user123',
                category: 'category1'
            },
            url: '/users/user123/transactions/category/category1',
        };
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                message: '',
            }
        };
        return { mockReq, mockRes };
    }

    it('should return 401 and error message if Admin authentication fails', async () => {
        const { mockReq, mockRes } = setup();
        const authErrorMsg = 'Mismatched role'
        mockRes.locals.message = authErrorMsg
        mockReq.url = '/transactions/users/user123/category/category1',

        verifyAuth.mockImplementationOnce(() => ({ authorized: false, cause: authErrorMsg }))

        await getTransactionsByUserByCategory(mockReq, mockRes);

        expect(User.findOne).not.toHaveBeenCalled();
        expect(categories.findOne).not.toHaveBeenCalled();
        expect(transactions.aggregate).not.toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(401)
        expect(mockRes.json).toHaveBeenCalledWith({ error: authErrorMsg });
    });

    it('should return 401 and error message if User authentication fails', async () => {
        const { mockReq, mockRes } = setup();
        const authErrorMsg = 'Mismatched role'
        mockRes.locals.message = authErrorMsg
        mockReq.url = '/users/user123/transactions/category/category1',

        verifyAuth.mockImplementationOnce(() => ({ authorized: false, cause: authErrorMsg }))

        await getTransactionsByUserByCategory(mockReq, mockRes);

        expect(User.findOne).not.toHaveBeenCalled();
        expect(categories.findOne).not.toHaveBeenCalled();
        expect(transactions.aggregate).not.toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(401)
        expect(mockRes.json).toHaveBeenCalledWith({ error: authErrorMsg });
    });

    it('should return undefined if the category does not exist', async () => {
        const { mockReq, mockRes } = setup();
        const errorMessage = 'Category not found';
        mockRes.locals.message = errorMessage

        verifyAuth.mockImplementationOnce(() => ({ authorized: true, }))
        categories.findOne.mockResolvedValueOnce(null);

        await getTransactionsByUserByCategory(mockReq, mockRes);

        expect(categories.findOne).toHaveBeenCalledWith({ type: 'category1' });
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({ error: errorMessage });
        expect(transactions.aggregate).not.toHaveBeenCalled();
    });

    it('should return an error message if the user does not exist', async () => {
        const { mockReq, mockRes } = setup();
        const errorMessage = 'User not found';
        mockRes.locals.message = errorMessage

        verifyAuth.mockImplementationOnce(() => ({ authorized: true, }))
        categories.findOne.mockResolvedValueOnce('category1');
        User.findOne.mockResolvedValueOnce(null);
        await getTransactionsByUserByCategory(mockReq, mockRes);

        expect(categories.findOne).toHaveBeenCalledWith({ type: 'category1' });;
        expect(User.findOne).toHaveBeenCalledWith({ username: 'user123' });
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({ error: errorMessage });
        expect(transactions.aggregate).not.toHaveBeenCalled();
    });

    it('should return an empty array if no transactions are found', async () => {
        const { mockReq, mockRes } = setup();

        categories.findOne.mockImplementationOnce(() => Promise.resolve('category1'));
        User.findOne.mockResolvedValueOnce('user123')
        transactions.aggregate.mockImplementationOnce(() => Promise.resolve([]));
        verifyAuth.mockImplementationOnce(() => ({ authorized: true }))

        await getTransactionsByUserByCategory(mockReq, mockRes);

        const filterQuery = { username: { $eq: mockReq.params.username }, type: { $eq: mockReq.params.category } };

        expect(transactions.aggregate).toHaveBeenCalledWith(composeTxAggregation(filterQuery));
        expect(mockRes.status).toHaveBeenCalledWith(200)
        expect(mockRes.json).toHaveBeenCalledWith({ data: [] });
    });

    it('should return transactions for the user for the specified category', async () => {
        const { mockReq, mockRes } = setup();
        mockReq.url = '/transactions/users/user123/category/category1';

        const mockTransactions = [
            {
                _id: 'tx1',
                username: 'username123',
                type: 'category1',
                amount: 100,
                date: new Date(),
                categories_info: { color: 'blue', },
            },
        ];

        categories.findOne.mockImplementationOnce(() => Promise.resolve('category1'));
        User.findOne.mockResolvedValueOnce('user123')
        transactions.aggregate.mockImplementationOnce(() => Promise.resolve(mockTransactions));
        verifyAuth.mockImplementationOnce(() => ({ authorized: true }))

        await getTransactionsByUserByCategory(mockReq, mockRes);

        const filterQuery = { username: { $eq: mockReq.params.username }, type: { $eq: mockReq.params.category } };

        expect(transactions.aggregate).toHaveBeenCalledWith(composeTxAggregation(filterQuery));
        expect(mockRes.status).toHaveBeenCalledWith(200)
        expect(mockRes.json).toHaveBeenCalledWith({
            data: [
                {
                    _id: 'tx1',
                    username: 'username123',
                    type: 'category1',
                    amount: 100,
                    date: mockTransactions[0].date,
                    color: 'blue',
                },
            ]
        });
    });

    it('should return an error message if there is an error', async () => {
        const { mockReq, mockRes } = setup();
        const errorMessage = 'Error retrieving transactions';
        mockRes.locals.message = errorMessage

        categories.findOne.mockImplementationOnce(() => Promise.resolve('category1'));
        User.findOne.mockResolvedValueOnce('user123')
        verifyAuth.mockImplementationOnce(() => ({ authorized: true }))
        transactions.aggregate.mockImplementationOnce(() => Promise.reject(new Error(errorMessage)));

        await getTransactionsByUserByCategory(mockReq, mockRes);

        const filterQuery = { username: { $eq: mockReq.params.username }, type: { $eq: mockReq.params.category } };

        expect(verifyAuth).toHaveBeenCalledWith(mockReq, mockRes, { authType: 'User', username: 'user123' });
        expect(transactions.aggregate).toHaveBeenCalledWith(composeTxAggregation(filterQuery));
        expect(mockRes.status).toHaveBeenCalledWith(500)
        expect(mockRes.json).toHaveBeenCalledWith({ error: errorMessage });
    });
})

describe("getTransactionsByGroup", () => {
    beforeEach(resetAllMocks);

    const setup = () => {
        const mockReq = {
            params: {
                name: 'group1'
            },
            url: '/transactions/groups/group1',
        };
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                message: '',
            }
        };
        return { mockReq, mockRes };
    }

    it('should return 400 and message if group is not verified', async () => {
        const { mockReq, mockRes } = setup();
        const verificationErrorMessage = 'group is not verified';
        mockRes.locals.message = verificationErrorMessage

        ensureGroupExistsAndVerify.mockResolvedValueOnce({ verified: false, auth: { authorized: true }, cause: verificationErrorMessage })

        await getTransactionsByGroup(mockReq, mockRes)

        expect(User.find).not.toHaveBeenCalled()
        expect(mockRes.status).toHaveBeenCalledWith(400)
        expect(mockRes.json).toHaveBeenCalledWith({ error: verificationErrorMessage })
    })

    it('should return 401 and message if group member(s) is/are not authenticated', async () => {
        const { mockReq, mockRes } = setup();
        const authErrorMessage = 'group member(s) not authenticated';
        mockRes.locals.message = authErrorMessage

        ensureGroupExistsAndVerify.mockResolvedValueOnce({ verified: false, auth: { authorized: false, cause: authErrorMessage }, })

        await getTransactionsByGroup(mockReq, mockRes)

        expect(User.find).not.toHaveBeenCalled()
        expect(mockRes.status).toHaveBeenCalledWith(401)
        expect(mockRes.json).toHaveBeenCalledWith({ error: authErrorMessage })
    })

    it('should return empty array if there are no members in the group', async () => {
        const { mockReq, mockRes } = setup();
        const mockGroup = {
            name: 'group1',
            members: [],
        };

        ensureGroupExistsAndVerify.mockResolvedValueOnce({
            group: mockGroup, verified: true, auth: { authorized: true }
        })

        await getTransactionsByGroup(mockReq, mockRes)

        expect(ensureGroupExistsAndVerify).toHaveBeenCalledWith('group1', mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(200)
        expect(mockRes.json).toHaveBeenCalledWith({ data: [] })
    })

    it('should return all transactions in the group', async () => {
        const { mockReq, mockRes } = setup();
        const mockGroup = {
            name: 'group1',
            members: [
                { user: 'user1', email: 'user1@example.com' },
                { user: 'user2', email: 'user2@example.com' },
            ],
        };
        const mockUsers = [
            { _id: 'user1', username: 'username1' },
            { _id: 'user2', username: 'username2' },
        ];
        const mockTransactions = [
            {
                _id: 'tx1',
                username: 'username1',
                type: 'category1',
                amount: 100,
                date: new Date(),
                categories_info: { color: 'blue', },
            },
            {
                _id: 'tx2',
                username: 'username2',
                type: 'category2',
                amount: 200,
                date: new Date(),
                categories_info: { color: 'blue', },
            },
        ];

        ensureGroupExistsAndVerify.mockResolvedValueOnce({
            group: mockGroup, verified: true, auth: { authorized: true, }
        })
        User.find.mockResolvedValueOnce(mockUsers);
        transactions.aggregate.mockResolvedValueOnce(mockTransactions);

        await getTransactionsByGroup(mockReq, mockRes)

        expect(ensureGroupExistsAndVerify).toHaveBeenCalledWith('group1', mockReq, mockRes);
        expect(User.find).toHaveBeenCalledWith({ email: { $in: ['user1@example.com', 'user2@example.com'] } })
        expect(transactions.aggregate).toHaveBeenCalledWith(composeTxAggregation({
            username: { $in: ['username1', 'username2'] },
        }));
        expect(mockRes.status).toHaveBeenCalledWith(200)
        expect(mockRes.json).toHaveBeenCalledWith({
            data:
                [
                    {
                        _id: 'tx1',
                        username: 'username1',
                        type: 'category1',
                        amount: 100,
                        date: mockTransactions[0].date,
                        color: 'blue',
                    },
                    {
                        _id: 'tx2',
                        username: 'username2',
                        type: 'category2',
                        amount: 200,
                        date: mockTransactions[1].date,
                        color: 'blue',
                    },
                ]
        })
    })

    it('should return an error message if there is an error', async () => {
        const { mockReq, mockRes } = setup();
        const errorMessage = 'Error returning group transactions';
        mockRes.locals.message = errorMessage

        ensureGroupExistsAndVerify.mockRejectedValueOnce(new Error(errorMessage))

        await getTransactionsByGroup(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(500)
        expect(mockRes.json).toHaveBeenCalledWith({ error: errorMessage });
    })
})

describe("getTransactionsByGroupByCategory", () => {
    beforeEach(resetAllMocks);

    const setup = () => {
        const mockReq = {
            params: {
                name: 'group1',
                category: 'category1'
            },
            url: '/transactions/groups/group1',
        };
        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                message: '',
            }
        };
        return { mockReq, mockRes };
    }

    it('should return 400 and message if group is not verified', async () => {
        const { mockReq, mockRes } = setup();
        const verificationErrorMessage = 'group is not verified';
        mockRes.locals.message = verificationErrorMessage

        ensureGroupExistsAndVerify.mockResolvedValueOnce({ verified: false, auth: { authorized: true }, cause: verificationErrorMessage })

        await getTransactionsByGroupByCategory(mockReq, mockRes)

        expect(User.find).not.toHaveBeenCalled()
        expect(mockRes.status).toHaveBeenCalledWith(400)
        expect(mockRes.json).toHaveBeenCalledWith({ error: verificationErrorMessage })
    })

    it('should return 401 and message if group member(s) is/are not authenticated', async () => {
        const { mockReq, mockRes } = setup();
        const authErrorMessage = 'group member(s) not authenticated';
        mockRes.locals.message = authErrorMessage

        ensureGroupExistsAndVerify.mockResolvedValueOnce({ verified: false, auth: { authorized: false, cause: authErrorMessage }, })

        await getTransactionsByGroupByCategory(mockReq, mockRes)

        expect(User.find).not.toHaveBeenCalled()
        expect(mockRes.status).toHaveBeenCalledWith(401)
        expect(mockRes.json).toHaveBeenCalledWith({ error: authErrorMessage })
    })

    it('should return 400 and message if category is not found', async () => {
        const { mockReq, mockRes } = setup();
        const catErrorMessage = 'Category not found';

        ensureGroupExistsAndVerify.mockResolvedValueOnce({ verified: true, auth: { authorized: true }, })
        categories.findOne.mockImplementationOnce(() => Promise.resolve(null));

        await getTransactionsByGroupByCategory(mockReq, mockRes)

        expect(categories.findOne).toHaveBeenCalledWith({ type: 'category1' });
        expect(User.find).not.toHaveBeenCalled()
        expect(mockRes.status).toHaveBeenCalledWith(400)
        expect(mockRes.json).toHaveBeenCalledWith({ error: catErrorMessage })
    })

    it('should return empty array if there are no members in the group', async () => {
        const { mockReq, mockRes } = setup();
        const mockGroup = {
            name: 'group1',
            members: [],
        };

        ensureGroupExistsAndVerify.mockResolvedValueOnce({
            group: mockGroup, verified: true, auth: { authorized: true }
        })
        categories.findOne.mockImplementationOnce(() => Promise.resolve('category1'));

        await getTransactionsByGroupByCategory(mockReq, mockRes)

        expect(ensureGroupExistsAndVerify).toHaveBeenCalledWith('group1', mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(200)
        expect(mockRes.json).toHaveBeenCalledWith({ data: [] })
    })

    it('should return all transactions in the group for the specified category', async () => {
        const { mockReq, mockRes } = setup();
        const mockGroup = {
            name: 'group1',
            members: [
                { user: 'user1', email: 'user1@example.com' },
                { user: 'user2', email: 'user2@example.com' },
            ],
        };
        const mockUsers = [
            { _id: 'user1', username: 'username1' },
            { _id: 'user2', username: 'username2' },
        ];
        const mockTransactions = [
            {
                _id: 'tx1',
                username: 'username1',
                type: 'category1',
                amount: 100,
                date: new Date(),
                categories_info: { color: 'blue', },
            },
            {
                _id: 'tx2',
                username: 'username2',
                type: 'category2',
                amount: 200,
                date: new Date(),
                categories_info: { color: 'blue', },
            },
        ];

        ensureGroupExistsAndVerify.mockResolvedValueOnce({
            group: mockGroup, verified: true, auth: { authorized: true, }
        })
        categories.findOne.mockImplementationOnce(() => Promise.resolve('category1'));
        User.find.mockResolvedValueOnce(mockUsers);
        transactions.aggregate.mockResolvedValueOnce([
            {
                _id: 'tx1',
                username: 'username1',
                type: 'category1',
                amount: 100,
                date: new Date(),
                categories_info: { color: 'blue', },
            },]);

        await getTransactionsByGroupByCategory(mockReq, mockRes)

        const filterQuery = { username: { $in: mockUsers.username }, type: { $eq: mockReq.params.category } };

        expect(ensureGroupExistsAndVerify).toHaveBeenCalledWith('group1', mockReq, mockRes);
        expect(User.find).toHaveBeenCalledWith({ email: { $in: ['user1@example.com', 'user2@example.com'] } })
        expect(transactions.aggregate).toHaveBeenCalledWith(composeTxAggregation(filterQuery));
        expect(mockRes.status).toHaveBeenCalledWith(200)
        expect(mockRes.json).toHaveBeenCalledWith({
            data:
                [
                    {
                        _id: 'tx1',
                        username: 'username1',
                        type: 'category1',
                        amount: 100,
                        date: mockTransactions[0].date,
                        color: 'blue',
                    },
                ]
        })
    })

    it('should return an error message if there is an error', async () => {
        const { mockReq, mockRes } = setup();
        const errorMessage = 'Error returning group transactions';
        mockRes.locals.message = errorMessage

        ensureGroupExistsAndVerify.mockRejectedValueOnce(new Error(errorMessage))

        await getTransactionsByGroupByCategory(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(500)
        expect(mockRes.json).toHaveBeenCalledWith({ error: errorMessage });
    })

})

describe("deleteTransaction", () => {
    beforeEach(resetAllMocks);
    afterEach(resetAllMocks);

    const setup = () => {
        const mockReq = {
            params: {
                username: 'user123',
            },
            body: {
                _id: 'transaction123',
            },
        };

        const mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            locals: {
                message: ""
            }
        };

        return { mockReq, mockRes };
    }

    it('should return an error message if there is an error', async () => {
        const { mockReq, mockRes } = setup();
        const errorMessage = 'Error deleting transaction';
        mockRes.locals.message = errorMessage

        verifyAuth.mockImplementationOnce(() => ({ authorized: true }));
        User.findOne.mockResolvedValueOnce({ username: 'user123' });
        transactions.findById.mockImplementationOnce(() => Promise.reject(new Error(errorMessage)));

        await deleteTransaction(mockReq, mockRes);

        expect(verifyAuth).toHaveBeenCalledWith(mockReq, mockRes, { authType: 'User', username: 'user123' });
        expect(transactions.findById).toHaveBeenCalledWith('transaction123');
        expect(mockRes.status).toHaveBeenCalledWith(500)
        expect(mockRes.json).toHaveBeenCalledWith({ error: errorMessage });
    });

    it('should return 400 and error message if request validation fails', async () => {
        const { mockReq, mockRes } = setup();
        const validationErrorMsg = 'validation error'
        mockRes.locals.message = validationErrorMsg
        verifyAuth.mockImplementationOnce(() => ({ authorized: true, }));
        validationFailed.mockReturnValueOnce(true)

        await deleteTransaction(mockReq, mockRes);
        
        expect(verifyAuth).toHaveBeenCalled();
        expect(validationFailed).toHaveBeenCalled();
        expect(transactions).not.toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.locals).toMatchObject({ message: validationErrorMsg });
    })

    it('should return 401 and error message if authorization fails', async () => {
        const { mockReq, mockRes } = setup();

        const authErrorMsg = 'Mismatched role'
        mockRes.locals.message = authErrorMsg

        verifyAuth.mockImplementationOnce(() => ({ authorized: false, cause: authErrorMsg }));

        await deleteTransaction(mockReq, mockRes);

        expect(categories).not.toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({ error: authErrorMsg });
    })

    it('should return 400 and error message if user is not found', async () => {
        const { mockReq, mockRes } = setup();

        const authErrorMsg = 'user not found'
        mockRes.locals.message = authErrorMsg

        verifyAuth.mockImplementationOnce(() => ({ authorized: true,}));
        User.findOne.mockResolvedValueOnce(null);

        await deleteTransaction(mockReq, mockRes);

        expect(categories).not.toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({ error: authErrorMsg });
    })

    it('should return 400 and error message if the transaction does not exist', async () => {
        const { mockReq, mockRes } = setup();

        const txErrorMessage = 'transaction not found'
        mockRes.locals.message = txErrorMessage

        verifyAuth.mockImplementationOnce(() => ({ authorized: true }));
        User.findOne.mockResolvedValueOnce({ username: 'user123' });
        transactions.findById.mockResolvedValueOnce(null);
        // transactions.deleteOne.mockImplementationOnce(() => Promise.resolve({}));

        await deleteTransaction(mockReq, mockRes);

        expect(verifyAuth).toHaveBeenCalledWith(mockReq, mockRes, { authType: 'User', username: 'user123' });
        expect(transactions.findById).toHaveBeenCalledWith('transaction123');
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({ error: txErrorMessage });
    });

    it('should return 401 and error message if the usernames do not match', async () => {
        const { mockReq, mockRes } = setup();

        const mismatchErrorMessage = 'Username mismatch'
        mockRes.locals.message = mismatchErrorMessage

        verifyAuth.mockImplementationOnce(() => ({ authorized: true }));
        User.findOne.mockResolvedValueOnce({ username: 'user123' });
        transactions.findById.mockResolvedValueOnce({ _id: 'transaction123', username: 'differentUser' });

        await deleteTransaction(mockReq, mockRes);

        expect(verifyAuth).toHaveBeenCalledWith(mockReq, mockRes, { authType: 'User', username: 'user123' });
        expect(transactions.findById).toHaveBeenCalledWith('transaction123');
        expect(transactions.deleteOne).not.toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({ error: mismatchErrorMessage });
    });

    it('should return successful deletion message if the transaction exists', async () => {
        const { mockReq, mockRes } = setup();

        verifyAuth.mockImplementationOnce(() => ({ authorized: true }));
        User.findOne.mockResolvedValueOnce({ username: 'user123' });
        transactions.findById.mockResolvedValueOnce({ username: 'user123' });
        transactions.deleteOne.mockImplementationOnce(() => Promise.resolve({}));

        await deleteTransaction(mockReq, mockRes);

        expect(verifyAuth).toHaveBeenCalledWith(mockReq, mockRes, { authType: 'User', username: 'user123' });
        expect(transactions.findById).toHaveBeenCalledWith('transaction123');
        expect(transactions.deleteOne).toHaveBeenCalledWith({ _id: 'transaction123' });
        expect(mockRes.json).toHaveBeenCalledWith({ data: { message: 'transaction deleted' } });
    });
})

describe("deleteTransactions", () => {
    beforeEach(resetAllMocks);
    const mockReq = {
        body: { _ids: ['id1', 'id2', 'id3'] },
    };

    const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        locals: {
            message: '',
        }
    };

    it('should return an error message if there is an error', async () => {
        const errorMessage = 'Error deleting transactions';
        mockRes.locals.message = errorMessage

        verifyAuth.mockImplementationOnce(() => ({ authorized: true }));
        transactions.find.mockImplementationOnce(() => Promise.reject(new Error(errorMessage)));

        await deleteTransactions(mockReq, mockRes);

        expect(verifyAuth).toHaveBeenCalled();
        expect(transactions.find).toHaveBeenCalledWith({ _id: { $in: mockReq.body._ids } });
        expect(mockRes.status).toHaveBeenCalledWith(500)
        expect(mockRes.json).toHaveBeenCalledWith({ error: errorMessage });
        expect(transactions.deleteMany).not.toHaveBeenCalled()
    });

    it('should return 401 and error message if authorization fails', async () => {
        const authErrorMsg = 'Mismatched role'
        mockRes.locals.message = authErrorMsg

        verifyAuth.mockImplementationOnce(() => ({ authorized: false, cause: authErrorMsg }));

        await deleteTransactions(mockReq, mockRes);

        expect(transactions).not.toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({ error: authErrorMsg });
    })

    it('should return 400 and error message if request validation fails', async () => {
        const validationErrorMsg = 'validation error'
        mockRes.locals.message = validationErrorMsg
        verifyAuth.mockImplementationOnce(() => ({ authorized: true, }));
        validationFailed.mockReturnValueOnce(true)

        await deleteTransactions(mockReq, mockRes);
        
        expect(verifyAuth).toHaveBeenCalled();
        expect(validationFailed).toHaveBeenCalled();
        expect(transactions).not.toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.locals).toMatchObject({ message: validationErrorMsg });
    })

    it('should return an error if at least one transaction is not found', async () => {
        const mockTransactions = [{ _id: 'id1', username: 'user1', amount: 100 }];

        verifyAuth.mockImplementationOnce(() => ({ authorized: true }));
        transactions.find.mockResolvedValueOnce(mockTransactions);

        await deleteTransactions(mockReq, mockRes);

        expect(transactions.find).toHaveBeenCalledWith({ _id: { $in: mockReq.body._ids } });
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({ error: 'some transactions are not found' });
        expect(transactions.deleteMany).not.toHaveBeenCalled();
    });

    it('should delete the transactions and return a success message', async () => {
        const mockTransactions = [
            { _id: 'id1', username: 'user1', amount: 100 },
            { _id: 'id2', username: 'user1', amount: 200 },
            { _id: 'id3', username: 'user2', amount: 150 },
        ];

        verifyAuth.mockImplementationOnce(() => ({ authorized: true }));
        transactions.find.mockResolvedValueOnce(mockTransactions);
        transactions.deleteMany.mockResolvedValueOnce();

        await deleteTransactions(mockReq, mockRes);

        expect(transactions.find).toHaveBeenCalledWith({ _id: { $in: mockReq.body._ids } });
        expect(transactions.deleteMany).toHaveBeenCalledWith({ _id: { $in: mockReq.body._ids } });
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith({ data: { message: 'transactions deleted' } });
    });
})
