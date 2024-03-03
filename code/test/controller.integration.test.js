import request from 'supertest';
import { app } from '../app';
import { categories, transactions } from '../models/model';
import mongoose, { Model } from 'mongoose';
import dotenv from 'dotenv';
import { User, Group } from '../models/User';
import { omit } from 'ramda';
import jwt from 'jsonwebtoken';
import { ObjectID } from 'bson';

dotenv.config();

beforeAll(async () => {
    const dbName = "testingDatabaseController";
    const url = `${process.env.MONGO_URI}/${dbName}`;

    await mongoose.connect(url, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });

});

afterAll(async () => {
    for (const conn of mongoose.connections) {
        await conn.db.dropDatabase();
        await conn.close()
    }
});

beforeEach(async () => {
    await User.deleteMany({});
    await Group.deleteMany({});
    await transactions.deleteMany({});
    await categories.deleteMany({});
})


const testerAccessTokenValid = jwt.sign({
    email: "tester@test.com",
    username: "tester",
    role: "Regular"
}, process.env.ACCESS_KEY, { expiresIn: '1y' })

const adminAccessTokenValid = jwt.sign({
    email: "tester@test.com",
    username: "admin",
    role: "Admin"
}, process.env.ACCESS_KEY, { expiresIn: '1y' })

describe("createCategory", () => {

    it('should return 401 and error message if user does not have Admin privilege', async () => {

        await request(app)
            .post("/api/categories")
            .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
            .then((response) => {
                expect(response.status).toBe(401)
                const errorMessage = response.body.error ? true : false
                //The test passes if the response body contains at least one of the two fields
                expect(errorMessage).toBe(true)
                expect(response.body.error).toEqual("Mismatched role")
            })
    })

    it("should return 401 and error message if validation fails", async () => {

        await request(app)
            .post("/api/categories")
            .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
            .then((response) => {
                expect(response.status).toBe(400)
                expect(response.body.error).toEqual('validation error')

            })

    })

    it('should return 400 and error message if the category already exists', async () => {
        await categories.create([{ type: 'type1', color: 'blue' },]);

        await request(app)
            .post("/api/categories")
            .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
            .send({ type: 'type1', color: 'blue' })
            .then((response) => {
                expect(response.status).toBe(400)
                expect(response.body.error).toEqual('category already exists')
            })
    })

    it('should create a new category and return the saved data', async () => {
        await request(app)
        .post("/api/categories")
        .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
        .send({ type: 'newType', color: 'blue' })
        .then((response) => {
            expect(response.status).toBe(200)
            expect(response.body.data).toMatchObject({
                type: 'newType',
                color: 'blue',
            });
        })
    })

    it('should return an error message if there is an error', async () => {

        const mockError = new Error('Database connection failed');
        jest.spyOn(categories, 'findOne').mockImplementationOnce(() => Promise.reject(mockError));
        
        await request(app)
        .post("/api/categories")
        .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
        .send({ type: 'newType', color: 'blue' })
        .then((response) => {
            expect(response.status).toBe(500)
            expect(response.body.error).toEqual('Database connection failed')
        })

        jest.resetAllMocks();
    })
})

describe("updateCategory", () => {

    it("it should return 400 and error if the request body does not contain all the necessary parameters", async () => {
        await categories.create({
            type: "food",
            color: "red"
        })
        await request(app)
        .patch("/api/categories/food")
        .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
        .then((response) => {
            expect(response.status).toBe(400)
            const errorMessage = response.body.error ? true : response.body.message ? true : false
            expect(errorMessage).toBe(true)
        })
    })

    it("should return 401 and error message if called by a user who is not an Admin", async () => {
        await categories.create({
            type: "food",
            color: "red"
        })
        await request(app)
            .patch("/api/categories/food")
            .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
            .send({ type: "food", color: "green" })
            .then((response) => {
                expect(response.status).toBe(401)
                expect(response.body.error).toEqual('Mismatched role')

            })

    })

    it("should return 400 and error message if category does not exist", async () => {
        await categories.create({
            type: "food",
            color: "red"
        })
        await request(app)
            .patch("/api/categories/travel")
            .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
            .send({ type: "food", color: "blue" })
            .then((response) => {
                expect(response.status).toBe(400)
                expect(response.body.error).toEqual('category not found')

            })

    })

    it("should return 400 and error message if the type of the new category is the same as one that exists already and that category is not the requested one", async () => {
        await categories.create({
            type: "food",
            color: "red"
        },
        {
            type: "travel",
            color: "blue"
        })
        await request(app)
            .patch("/api/categories/food")
            .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
            .send({ type: "travel", color: "blue" })
            .then((response) => {
                expect(response.status).toBe(400)
                expect(response.body.error).toEqual('such category already exists')

            })

    })

    it("should update the category and related transactions, and return success message and count", async () => {
        await categories.create({
            type: "food",
            color: "red"
        })
        await transactions.insertMany([{
            username: "tester",
            type: "food",
            amount: 20
        }, {
            username: "tester",
            type: "food",
            amount: 100
        }])
        await request(app)
            .patch("/api/categories/food")
            .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
            .send({ type: "travel", color: "blue" })
            .then((response) => {
                expect(response.status).toBe(200)
                expect(response.body.data.message).toEqual('Category edited successfully')
                expect(response.body.data.count).toEqual(2)

            })

    })

    it('should return an error message if there is an error', async () => {
        await categories.create({
            type: "food",
            color: "red"
        })
        const mockError = new Error('Database connection failed');
        jest.spyOn(categories, 'findOne').mockImplementationOnce(() => Promise.reject(mockError));
        
        await request(app)
        .patch("/api/categories/food")
        .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
        .send({ type: "travel", color: "blue" })
        .then((response) => {
            expect(response.status).toBe(500)
            expect(response.body.error).toEqual('Database connection failed')
        })

        jest.resetAllMocks();
    })
})

describe("deleteCategory", () => {

    it("should return 401 and error message if called by a user who is not an Admin", async () => {

        await request(app)
            .delete("/api/categories")
            .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
            .send({ types: ['type1'] })
            .then((response) => {
                expect(response.status).toBe(401)
                expect(response.body.error).toEqual('Mismatched role')

            })

    })

    it("should return 401 and error message if validation fails", async () => {

        await request(app)
            .delete("/api/categories")
            .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
            .send({})
            .then((response) => {
                expect(response.status).toBe(400)
                expect(response.body.error).toEqual('validation error')
            })
    })

    it("should return 400 and error message if not all categories exist in database", async () => {
        await categories.create([
            { type: 'type1', color: '#fac' },
        ]);
        await request(app)
            .delete("/api/categories")
            .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
            .send({ types: ['type1', 'type2'] })
            .then((response) => {
                expect(response.status).toBe(400)
                expect(response.body.error).toEqual('not all types exist in database')

            })

    })

    it("should return 400 and error message if only one category exists in the database", async () => {
        await categories.create([
            { type: 'type1', color: '#fac' },
        ]);
        await request(app)
            .delete("/api/categories")
            .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
            .send({ types: ['type1', ] })
            .then((response) => {
                expect(response.status).toBe(400)
                expect(response.body.error).toEqual('only one category in db')

            })

    })

    it("should return 400 error when the oldest category is not found and N > T", async () => {
        await categories.create([
            { type: 'type1', color: '#fac' },
            { type: 'type2', color: '#blue' },
        ]);

        jest.spyOn(categories, 'findOne').mockImplementationOnce(() => ({ sort: jest.fn(() => Promise.resolve(null)) }));
        
        await request(app)
            .delete("/api/categories")
            .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
            .send({ types: ['type1', ] })
            .then((response) => {
                expect(response.status).toBe(400)
                expect(response.body.error).toEqual('cannot find oldest category')

            })
        
        jest.resetAllMocks();
    })

    it("should return 400 error when the oldest category is not found and N == T", async () => {
        await categories.create([
            { type: 'type1', color: '#fac' },
            { type: 'type2', color: '#blue' },
        ]);

        jest.spyOn(categories, 'findOne').mockImplementationOnce(() => ({ sort: jest.fn(() => Promise.resolve(null)) }));
        
        await request(app)
            .delete("/api/categories")
            .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
            .send({ types: ['type1', 'type2'] })
            .then((response) => {
                expect(response.status).toBe(400)
                expect(response.body.error).toEqual('cannot find oldest category')

            })
        
        jest.resetAllMocks();
    })

    it('should delete all categories', async () => {
        const user = {
            username: "tester",
            email: "tester@test.com",
            password: "tester",
            refreshToken: testerAccessTokenValid
        }
        await categories.create([
            { type: 'type1', color: '#fac' },
            { type: 'type2', color: '#eba' }
        ]);
        await transactions.create([
            { username: user.username, amount: 10, type: 'type1', date: new Date() },
            { username: user.username, amount: 45, type: 'type1', date: new Date() },
            { username: user.username, amount: 100, type: 'type2', date: new Date() },
        ]);

        await request(app)
            .delete("/api/categories")
            .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
            .send({ types: ['type1'] })
            .expect(200)
            .then(({ body }) => {
                expect(body.data).toMatchObject({
                    message: 'Success',
                    count: 2,
                });
            })
    });

    it('should delete all categories except oldest when trying to delete all categories', async () => {
        const user = {
            username: "tester",
            email: "tester@test.com",
            password: "tester",
            refreshToken: testerAccessTokenValid
        }
        await categories.create({ type: 'type1', color: '#fac' });
        await categories.create({ type: 'type2', color: '#eba' });
        await transactions.create([
            { username: user.username, amount: 10, type: 'type1', date: new Date() },
            { username: user.username, amount: 45, type: 'type1', date: new Date() },
            { username: user.username, amount: 100, type: 'type2', date: new Date() },
        ]);

        await request(app)
            .delete("/api/categories")
            .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
            .send({ types: ['type1', 'type2'] })
            .expect(200)
            .then(({ body }) => {
                expect(body.data).toMatchObject({
                    message: 'Success',
                    count: 1,
                });
            })
        expect(await transactions.count({ type: 'type2' })).toEqual(0)
    });

    it('should return 400 and error message when passing empty array', async () => {
        const user = {
            username: "tester",
            email: "tester@test.com",
            password: "tester",
            refreshToken: testerAccessTokenValid
        }
        await categories.create([
            { type: 'type1', color: '#fac' },
            { type: 'type2', color: '#eba' }
        ]);
        await transactions.create([
            { username: user.username, amount: 10, type: 'type1', date: new Date() },
            { username: user.username, amount: 100, type: 'type2', date: new Date() },
        ]);
        await request(app)
            .delete("/api/categories")
            .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
            .send({ types: [] })
            .expect(400)
            .then(({ body }) => {
                expect(body.error).toEqual('validation error')
            })
    });

    it('should return an error message if there is an error', async () => {
        const user = {
            username: "tester",
            email: "tester@test.com",
            password: "tester",
            refreshToken: testerAccessTokenValid
        }
        await categories.create([
            { type: 'type1', color: '#fac' },
            { type: 'type2', color: '#eba' }
        ]);
        await transactions.create([
            { username: user.username, amount: 10, type: 'type1', date: new Date() },
            { username: user.username, amount: 45, type: 'type1', date: new Date() },
            { username: user.username, amount: 100, type: 'type2', date: new Date() },
        ]);

        const mockError = new Error('Database connection failed');
        jest.spyOn(categories, 'deleteMany').mockImplementationOnce(() => Promise.reject(mockError));
        
        await request(app)
            .delete("/api/categories")
            .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
            .send({ types: ['type1'] })
            .then((response) => {
                expect(response.status).toBe(500)
                expect(response.body.error).toEqual('Database connection failed')
            })

        jest.resetAllMocks();
    });

})

describe("getCategories", () => {

    it("should return 401 and error message if authorization fails", async () => {
        const testerAccessTokenInvalid = jwt.sign({
            email: "",
            username: "tester",
            role: "Regular"
        }, process.env.ACCESS_KEY, { expiresIn: '1y' })

        await categories.create({
            type: "food",
            color: "red"
        })
        await request(app)
            .get("/api/categories")
            .set("Cookie", `accessToken=${testerAccessTokenInvalid}; refreshToken=${testerAccessTokenValid}`)
            .then((response) => {
                expect(response.status).toBe(401)
                expect(response.body.error).toEqual('Token is missing information')

            })

    })

    it("Should return list of categories", async () => {
        await categories.create([{
            type: "food",
            color: "red",
            createdAt: new Date()
        },
        {
            type: "travel",
            color: "blue",
            createdAt: new Date(Date.now() + 1000)
        }])
        await request(app)
            .get("/api/categories")
            .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
            .then((response) => {
                expect(response.status).toBe(200)
                expect(response.body.data).toHaveLength(2);
                expect(response.body.data).toMatchObject([{
                    type: "food",
                    color: "red"
                },
                {
                    type: "travel",
                    color: "blue"
                }])
            })

    })

    it('should return an error message if there is an error', async () => {
        await categories.create({
            type: "food",
            color: "red"
        })
        const mockError = new Error('Database connection failed');
        jest.spyOn(categories, 'find').mockImplementationOnce(() => ({sort: jest.fn(() => Promise.reject(mockError)) }));
        
        await request(app)
        .get("/api/categories")
        .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
        .then((response) => {
            expect(response.status).toBe(500)
            expect(response.body.error).toEqual('Database connection failed')
        })

        jest.resetAllMocks();
    })
})

describe("createTransaction", () => {
    it("should return 401 and error message if authorization fails", async () => {
        const testerAccessTokenInvalid = jwt.sign({
            email: "",
            username: "tester",
            role: "Regular"
        }, process.env.ACCESS_KEY, { expiresIn: '1y' })
        const user = {
            username: "tester",
            email: "tester@test.com",
            password: "tester",
            refreshToken: testerAccessTokenInvalid
        }
        User.create({
            username: user.username,
            email: user.email,
            password: user.password,
            refreshToken: user.refreshToken,
        })

        await request(app)
            .post(`/api/users/${user.username}/transactions`)
            .set("Cookie", `accessToken=${testerAccessTokenInvalid}; refreshToken=${testerAccessTokenValid}`)
            .send({ username: user.username, amount: 50, type: 'type1', date: new Date('2023-05-08T16:30:00.000Z') })
            .then((response) => {
                expect(response.status).toBe(401)
                expect(response.body.error).toEqual('Token is missing information')

            })

    })

    it("should return 401 and error message if validation fails", async () => {
        const testerAccessTokenInvalid = jwt.sign({
            email: "tester@test.com",
            username: "tester",
            role: "Regular"
        }, process.env.ACCESS_KEY, { expiresIn: '1y' })
        const user = {
            username: "tester",
            email: "tester@test.com",
            password: "tester",
            refreshToken: testerAccessTokenInvalid
        }
        User.create({
            username: user.username,
            email: user.email,
            password: user.password,
            refreshToken: user.refreshToken,
        })

        await request(app)
        .post(`/api/users/${user.username}/transactions`)
        .set("Cookie", `accessToken=${testerAccessTokenInvalid}; refreshToken=${testerAccessTokenInvalid}`)
            .send({})
            .then((response) => {
                expect(response.status).toBe(400)
                expect(response.body.error).toEqual('validation error')
            })
    })

    it("should return 400 and error message if category is not found for the transaction being created", async () => {
        await categories.create({ type: 'type1', color: '#ffaacc' });
        const user = {
            username: "tester",
            email: "tester@test.com",
            password: "tester",
            refreshToken: testerAccessTokenValid
        }
        User.create({
            username: user.username,
            email: user.email,
            password: user.password,
            refreshToken: user.refreshToken,
        })

        await request(app)
            .post(`/api/users/${user.username}/transactions`)
            .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
            .send({ username: user.username, amount: 50, type: 'type2', date: new Date('2023-05-08T16:30:00.000Z') })
            .then((response) => {
                expect(response.status).toBe(400)
                expect(response.body.error).toEqual('Category not found')

            })

    })

    it("should return 400 and error message if there is a username mismatch", async () => {
        await categories.create({ type: 'type1', color: '#ffaacc' });
        const user = {
            username: "tester",
            email: "tester@test.com",
            password: "tester",
            refreshToken: testerAccessTokenValid
        }
        User.create({
            username: user.username,
            email: user.email,
            password: user.password,
            refreshToken: user.refreshToken,
        })

        await request(app)
            .post(`/api/users/${user.username}/transactions`)
            .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
            .send({ username: 'wrongUser', amount: 50, type: 'type1', date: new Date('2023-05-08T16:30:00.000Z') })
            .then((response) => {
                expect(response.status).toBe(400)
                expect(response.body.error).toEqual('usernames mismatch')

            })

    })

    it("should return 400 and error message if user is not found", async () => {
        await categories.create({ type: 'type1', color: '#ffaacc' });
        const user = {
            username: "tester",
            email: "tester@test.com",
            password: "tester",
            refreshToken: testerAccessTokenValid
        }

        await request(app)
            .post(`/api/users/${user.username}/transactions`)
            .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
            .send({ username: user.username, amount: 50, type: 'type1', date: new Date('2023-05-08T16:30:00.000Z') })
            .then((response) => {
                expect(response.status).toBe(400)
                expect(response.body.error).toEqual('user not found')

            })

    })

    it("should create transaction and return data", async () => {
        await categories.create({ type: 'type1', color: '#ffaacc' });
        const user = {
            username: "tester",
            email: "tester@test.com",
            password: "tester",
            refreshToken: testerAccessTokenValid
        }
        User.create({
            username: user.username,
            email: user.email,
            password: user.password,
            refreshToken: user.refreshToken,
        })

        await request(app)
            .post(`/api/users/${user.username}/transactions`)
            .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
            .send({ username: user.username, amount: 50, type: 'type1', date: '2023-05-08T16:30:00.000Z' })
            .then((response) => {
                expect(response.status).toBe(200)
                expect(response.body.data.username).toEqual(user.username)
                expect(response.body.data.amount).toEqual(50)
                expect(response.body.data.type).toEqual('type1')
            })
    })

    it('should return an error message if there is an error', async () => {
        await categories.create({ type: 'type1', color: '#ffaacc' });
        const user = {
            username: "tester",
            email: "tester@test.com",
            password: "tester",
            refreshToken: testerAccessTokenValid
        }
        User.create({
            username: user.username,
            email: user.email,
            password: user.password,
            refreshToken: user.refreshToken,
        })
        
        const mockError = new Error('Database connection failed');
        jest.spyOn(transactions.prototype, 'save').mockImplementationOnce(() => Promise.reject(mockError));
        
        await request(app)
            .post(`/api/users/${user.username}/transactions`)
            .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
            .send({ username: user.username, amount: 50, type: 'type1', date: '2023-05-08T16:30:00.000Z' })
            .then((response) => {
                expect(response.status).toBe(500)
                expect(response.body.error).toEqual('Database connection failed')
            })

        jest.resetAllMocks();
    })
})

describe("getAllTransactions", () => {
    it("should return 401 and error message if authorization fails", async () => {

        await request(app)
            .get(`/api/transactions`)
            .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
            .then((response) => {
                expect(response.status).toBe(401)
                expect(response.body.error).toEqual('Mismatched role')

            })

    })

    it("Should return empty list, when there are no transactions", async () => {

        await request(app)
            .get(`/api/transactions`)
            .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
            .then((response) => {
                expect(response.status).toBe(200)
                expect(response.body.data).toEqual([])

            })

    })

    it("Should return transaction list", async () => {
        transactions.deleteMany({})
        await categories.create({ type: 'type1', color: '#ffaacc' });
        
        await transactions.create([
            { username: 'user1', amount: 10, type: 'type1', date: new Date('2023-05-08T16:30:00.000Z') },
            { username: 'user1', amount: 45, type: 'type1', date: new Date('2023-05-12T16:30:00.000Z') },
        ]);
        await request(app)
            .get(`/api/transactions`)
            .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
            .send()
            .then((response) => {
                expect(response.status).toBe(200)
                expect(response.body.data).toMatchObject([
                    { username: 'user1', amount: 45, type: 'type1', date: '2023-05-12T16:30:00.000Z' },
                    { username: 'user1', amount: 10, type: 'type1', date: '2023-05-08T16:30:00.000Z' },
                ])

            })

    })

    it('should return an error message if there is an error', async () => {
        await categories.create({
            type: "type1",
            color: "red"
        })
        await transactions.create([
            { username: 'user1', amount: 10, type: 'type1', date: new Date('2023-05-08T16:30:00.000Z') },
            { username: 'user1', amount: 45, type: 'type1', date: new Date('2023-05-08T16:30:00.000Z') },
        ]);
        const mockError = new Error('Database connection failed');
        jest.spyOn(transactions, 'aggregate').mockImplementationOnce(() => Promise.reject(mockError));
        
        await request(app)
        .get("/api/transactions")
        .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
        .then((response) => {
            expect(response.status).toBe(500)
            expect(response.body.error).toEqual('Database connection failed')
        })

        jest.resetAllMocks();
    })
})

describe("getTransactionsByUser", () => {
    const setup = async () => {
        const user1 = {
            username: "tester",
            email: "tester@test.com",
            password: "tester",
            refreshToken: testerAccessTokenValid
        }
        User.create({
            username: user1.username,
            email: user1.email,
            password: user1.password,
            refreshToken: user1.refreshToken,
        })
        const admin = {
            username: "admin",
            email: "admin@test.com",
            password: "admin",
            refreshToken: adminAccessTokenValid,
            role: "Admin"
        }
        User.create({
            username: admin.username,
            email: admin.email,
            password: admin.password,
            refreshToken: admin.refreshToken,
        })

        await categories.create({ type: 'type1', color: '#ffaacc' });
        return { user1, admin };
    }
    const convertTransaction = t => ({ ...omit(['__v'], t), _id: t._id.toString(), date: t.date.toISOString(), color: '#ffaacc' })

    test('should return 400 and error message if user is not found', async () => {

        await request(app)
            .get('/api/transactions/users/user1')
            .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
            .expect(400)
            .then(({ body }) => {
                expect(body.error).toEqual('User not found');
            })
    });

    test('[admin] should return 401 and error message if authentication fails', async () => {
        const admin = {
            username: "admin",
            email: "admin@test.com",
            password: "admin",
            refreshToken: adminAccessTokenValid,
            role: "Admin"
        }
        User.create({
            username: admin.username,
            email: admin.email,
            password: admin.password,
            refreshToken: admin.refreshToken,
        })

        await request(app)
            .get(`/api/transactions/users/${admin.username}`)
            .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
            .expect(401)
            .then(({ body }) => {
                expect(body.error).toEqual('Mismatched role');
            })
    });

    test('[user] should return 401 and error message if authentication fails', async () => {
        const user1 = {
            username: "tester",
            email: "tester@test.com",
            password: "tester",
            refreshToken: testerAccessTokenValid
        }
        User.create({
            username: user1.username,
            email: user1.email,
            password: user1.password,
            refreshToken: user1.refreshToken,
        })
        const testerAccessTokenInvalid = jwt.sign({
            email: "",
            username: "tester",
            role: "Regular"
        }, process.env.ACCESS_KEY, { expiresIn: '1y' })
        await request(app)
            .get(`/api/users/${user1.username}/transactions`)
            .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenInvalid}`)
            .expect(401)
            .then(({ body }) => {
                expect(body.error).toEqual('Token is missing information');
            })
    });

    test('[admin] should fetch all transactions of user', async () => {
        const { user1, admin } = await setup();
        const txs = await transactions.create([
            ({ username: user1.username, amount: 50, type: 'type1', date: new Date('2023-05-08T16:30:00.000Z') }),
            ({ username: user1.username, amount: 150, type: 'type1', date: new Date('2023-05-14T21:45:17.000Z') }),
        ]).then(txs => txs.map(t => t.toJSON()));

        await request(app)
            .get(`/api/transactions/users/${user1.username}`)
            .set("Cookie", `accessToken=${admin.refreshToken}; refreshToken=${admin.refreshToken}`)
            .expect(200)
            .then(({ body }) => {
                expect(body.data).toHaveLength(2);
                expect(body.data).toEqual([txs[1], txs[0]].map(convertTransaction));
            })
    });

    test('[user] should fetch all transactions', async () => {
        const { user1 } = await setup();
        const txs = await transactions.create([
            ({ username: user1.username, amount: 50, type: 'type1', date: new Date('2023-05-08T16:30:00.000Z') }),
            ({ username: user1.username, amount: 150, type: 'type1', date: new Date('2023-05-14T21:45:17.000Z') }),
        ]).then(txs => txs.map(t => t.toJSON()));

        await request(app)
            .get(`/api/users/${user1.username}/transactions`)
            .set("Cookie", `accessToken=${user1.refreshToken}; refreshToken=${user1.refreshToken}`)
            .expect(200)
            .then(({ body }) => {
                expect(body.data).toHaveLength(2);
                expect(body.data).toEqual([txs[1], txs[0]].map(convertTransaction));
            })
    });

    test('[user] should filter transactions by amount', async () => {
        const { user1 } = await setup();
        const txs = await transactions.create([
            ({ username: user1.username, amount: 45, type: 'type1', date: new Date('2023-05-13T11:05:33.000Z') }),
            ({ username: user1.username, amount: 211, type: 'type1', date: new Date('2023-05-14T18:40:20.000Z') }),
        ]).then(txs => txs.map(t => t.toJSON()));

        await request(app)
            .get(`/api/users/${user1.username}/transactions?min=100`)
            .set("Cookie", `accessToken=${user1.refreshToken}; refreshToken=${user1.refreshToken}`)
            .expect(200)
            .then(({ body }) => {
                expect(body.data).toHaveLength(1);
                expect(body.data[0]).toEqual(convertTransaction(txs[1]));
            });
        await request(app)
            .get(`/api/users/${user1.username}/transactions?min=40&max=100`)
            .set("Cookie", `accessToken=${user1.refreshToken}; refreshToken=${user1.refreshToken}`)
            .expect(200)
            .then(({ body }) => {
                expect(body.data).toHaveLength(1);
                expect(body.data[0]).toEqual(convertTransaction(txs[0]));
            });
        await request(app)
            .get(`/api/users/${user1.username}/transactions?max=50`)
            .set("Cookie", `accessToken=${user1.refreshToken}; refreshToken=${user1.refreshToken}`)
            .expect(200)
            .then(({ body }) => {
                expect(body.data).toHaveLength(1);
                expect(body.data[0]).toEqual(convertTransaction(txs[0]));
            });
    });
    test('[user] should filter transactions by date', async () => {
        const { user1 } = await setup();
        const txs = await transactions.create([
            ({ username: user1.username, amount: 50, type: 'type1', date: new Date('2023-05-08T16:30:00.000Z') }),
            ({ username: user1.username, amount: 150, type: 'type1', date: new Date('2023-05-14T21:45:17.000Z') }),
        ]).then(txs => txs.map(t => t.toJSON()));

        await request(app)
            .get(`/api/users/${user1.username}/transactions?from=2023-05-10`)
            .set("Cookie", `accessToken=${user1.refreshToken}; refreshToken=${user1.refreshToken}`)
            .expect(200)
            .then(({ body }) => {
                expect(body.data).toHaveLength(1);
                expect(body.data[0]).toEqual(convertTransaction(txs[1]));
            });
        await request(app)
            .get(`/api/users/${user1.username}/transactions?date=2023-05-08`)
            .set("Cookie", `accessToken=${user1.refreshToken}; refreshToken=${user1.refreshToken}`)
            .expect(200)
            .then(({ body }) => {
                expect(body.data).toHaveLength(1);
                expect(body.data[0]).toEqual(convertTransaction(txs[0]));
            });
        await request(app)
            .get(`/api/users/${user1.username}/transactions?from=2023-05-01&upTo=2023-05-09`)
            .set("Cookie", `accessToken=${user1.refreshToken}; refreshToken=${user1.refreshToken}`)
            .expect(200)
            .then(({ body }) => {
                expect(body.data).toHaveLength(1);
                expect(body.data[0]).toEqual(convertTransaction(txs[0]));
            });
    });
    test('[user] should return 400 when passing both date and from', async () => {
        const { user1 } = await setup();
        const txs = await transactions.create([
            ({ username: user1.username, amount: 50, type: 'type1', date: new Date('2023-05-08T16:30:00.000Z') }),
            ({ username: user1.username, amount: 150, type: 'type1', date: new Date('2023-05-14T21:45:17.000Z') }),
        ]).then(txs => txs.map(t => t.toJSON()));
        await request(app)
            .get(`/api/users/${user1.username}/transactions?date=2023-05-08&from=2023-05-01`)
            .set("Cookie", `accessToken=${user1.refreshToken}; refreshToken=${user1.refreshToken}`)
            .expect(400);
    })

    it('should return an error message if there is an error', async () => {
        const { user1 } = await setup();
        const txs = await transactions.create([
            ({ username: user1.username, amount: 50, type: 'type1', date: new Date('2023-05-08T16:30:00.000Z') }),
            ({ username: user1.username, amount: 150, type: 'type1', date: new Date('2023-05-14T21:45:17.000Z') }),
        ]).then(txs => txs.map(t => t.toJSON()));


        const mockError = new Error('Database connection failed');
        jest.spyOn(transactions, 'aggregate').mockImplementationOnce(() => Promise.reject(mockError));
        
        await request(app)
            .get(`/api/users/${user1.username}/transactions`)
            .set("Cookie", `accessToken=${user1.refreshToken}; refreshToken=${user1.refreshToken}`)
            .then((response) => {
                expect(response.status).toBe(500)
                expect(response.body.error).toEqual('Database connection failed')
            })

        jest.resetAllMocks();
    })
})

describe("getTransactionsByUserByCategory", () => {
    const setup = async () => {
        const user1 = {
            username: "tester",
            email: "tester@test.com",
            password: "tester",
            refreshToken: testerAccessTokenValid
        }
        User.create({
            username: user1.username,
            email: user1.email,
            password: user1.password,
            refreshToken: user1.refreshToken,
        })
        const admin = {
            username: "admin",
            email: "admin@test.com",
            password: "admin",
            refreshToken: adminAccessTokenValid,
            role: "Admin"
        }
        User.create({
            username: admin.username,
            email: admin.email,
            password: admin.password,
            refreshToken: admin.refreshToken,
        })

        await categories.create({ type: 'type1', color: '#ffaacc' });
        return { user1, admin };
    }
    const convertTransaction = t => ({ ...omit(['__v'], t), _id: t._id.toString(), date: t.date.toISOString(), color: '#ffaacc' })

    test('should return 400 and error message if category is not found', async () => {

        await request(app)
            .get('/api/transactions/users/user1/category/category2')
            .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
            .expect(400)
            .then(({ body }) => {
                expect(body.error).toEqual('Category not found');
            })
    });

    test('should return 400 and error message if user is not found', async () => {
        await categories.create({ type: 'type1', color: '#ffaacc' });

        await request(app)
            .get('/api/transactions/users/user1/category/type1')
            .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
            .expect(400)
            .then(({ body }) => {
                expect(body.error).toEqual('User not found');
            })
    });

    test('[admin] should return 401 and error message if authentication fails', async () => {
        const admin = {
            username: "admin",
            email: "admin@test.com",
            password: "admin",
            refreshToken: adminAccessTokenValid,
            role: "Admin"
        }
        User.create({
            username: admin.username,
            email: admin.email,
            password: admin.password,
            refreshToken: admin.refreshToken,
        })
        const testerAccessTokenValid = jwt.sign({
            email: "tester@test.com",
            username: "tester",
            role: "User"
        }, process.env.ACCESS_KEY, { expiresIn: '1y' })

        await categories.create({ type: 'type1', color: '#ffaacc' });

        await request(app)
            .get(`/api/transactions/users/${admin.username}/category/type1`)
            .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
            .expect(401)
            .then(({ body }) => {
                expect(body.error).toEqual('Mismatched role');
            })
    });

    test('[user] should return 401 and error message if authentication fails', async () => {
        const user1 = {
            username: "tester",
            email: "tester@test.com",
            password: "tester",
            refreshToken: testerAccessTokenValid
        }
        User.create({
            username: user1.username,
            email: user1.email,
            password: user1.password,
            refreshToken: user1.refreshToken,
        })
        const testerAccessTokenInvalid = jwt.sign({
            email: "",
            username: "tester",
            role: "Regular"
        }, process.env.ACCESS_KEY, { expiresIn: '1y' })
        await categories.create({ type: 'type1', color: '#ffaacc' });

        await request(app)
            .get(`/api/users/${user1.username}/transactions/category/type1`)
            .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenInvalid}`)
            .expect(401)
            .then(({ body }) => {
                expect(body.error).toEqual('Token is missing information');
            })
    });

    test('[admin] should fetch all transactions of user by category', async () => {
        const { user1, admin } = await setup();
        const txs = await transactions.create([
            ({ username: user1.username, amount: 50, type: 'type1', date: new Date('2023-05-08T16:30:00.000Z') }),
            ({ username: user1.username, amount: 150, type: 'type1', date: new Date('2023-05-14T21:45:17.000Z') }),
        ]).then(txs => txs.map(t => t.toJSON()));

        await request(app)
            .get(`/api/transactions/users/${user1.username}/category/type1`)
            .set("Cookie", `accessToken=${admin.refreshToken}; refreshToken=${admin.refreshToken}`)
            .expect(200)
            .then(({ body }) => {
                expect(body.data).toHaveLength(2);
                expect(body.data).toEqual([txs[1], txs[0]].map(convertTransaction));
            })
    });

    test('[user] should fetch all transactions by category', async () => {
        const { user1 } = await setup();
        await categories.create({ type: 'type2', color: 'yellow' });
        const txs = await transactions.create([
            ({ username: user1.username, amount: 50, type: 'type1', date: new Date('2023-05-08T16:30:00.000Z') }),
            ({ username: user1.username, amount: 150, type: 'type1', date: new Date('2023-05-14T21:45:17.000Z') }),
            ({ username: user1.username, amount: 50, type: 'type2', date: new Date('2023-05-08T16:30:00.000Z') }),
            ({ username: user1.username, amount: 150, type: 'type2', date: new Date('2023-05-14T21:45:17.000Z') }),
        ]).then(txs => txs.map(t => t.toJSON()));

        await request(app)
            .get(`/api/users/${user1.username}/transactions/category/type1`)
            .set("Cookie", `accessToken=${user1.refreshToken}; refreshToken=${user1.refreshToken}`)
            .expect(200)
            .then(({ body }) => {
                expect(body.data).toHaveLength(2);
                expect(body.data).toEqual([txs[1], txs[0]].map(convertTransaction));
            })
    });

    it('should return an error message if there is an error', async () => {
        const { user1 } = await setup();
        const txs = await transactions.create([
            ({ username: user1.username, amount: 50, type: 'type1', date: new Date('2023-05-08T16:30:00.000Z') }),
            ({ username: user1.username, amount: 150, type: 'type1', date: new Date('2023-05-14T21:45:17.000Z') }),
        ]).then(txs => txs.map(t => t.toJSON()));


        const mockError = new Error('Database connection failed');
        jest.spyOn(transactions, 'aggregate').mockImplementationOnce(() => Promise.reject(mockError));
        
        await request(app)
            .get(`/api/users/${user1.username}/transactions/category/type1`)
            .set("Cookie", `accessToken=${user1.refreshToken}; refreshToken=${user1.refreshToken}`)
            .then((response) => {
                expect(response.status).toBe(500)
                expect(response.body.error).toEqual('Database connection failed')
            })

        jest.resetAllMocks();
    })
})

describe("getTransactionsByGroup", () => {

    const setupGroupTxCat = async (user1, user2) => {
        Group.create({ 
            name: 'group1',
            members: [
                { user: user1._id, email: user1.email },
                { user: user2._id, email: user2.email },
            ],
        })
        await categories.create({ type: 'type1', color: '#ffaacc' });

        const txs = await transactions.create([
            ({ username: user1.username, amount: 50, type: 'type1', date: new Date('2023-05-08T16:30:00.000Z') }),
            ({ username: user2.username, amount: 150, type: 'type1', date: new Date('2023-05-12T16:30:00.000Z') }),
        ]).then(txs => txs.map(t => t.toJSON()));

        return {txs}
    }

    it('should return 400 and message if group is not verified', async () => {
        await request(app)
        .get('/api/transactions/groups/group1')
        .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
        .expect(400)
        .then(({ body }) => {
            expect(body.error).toEqual('Group not found');
        })
    
    })

    it('[admin] should return 200 and empty array if group has no members', async () => {
        const admin = await User.create({
            password: "tester",
            email: "tester@test.com",
            username: "admin",
            refreshToken: adminAccessTokenValid
        })

        Group.create({ 
            name: 'emptyGroup',
            members: [],
        })

        await request(app)
        .get("/api/transactions/groups/emptyGroup")
        .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
        .expect(200)
        .then(({ body }) => {            
            expect(body.data).toEqual([]);
        })

    })

    it('should return 401 and message if group member(s) is/(are) not verified', async () => {
        const testerAccessTokenInvalid = jwt.sign({
            email: "",
            username: "user1",
            role: "User"
        }, process.env.ACCESS_KEY, { expiresIn: '1y' })

        const user1 = await User.create({
            username: "user1",
            email: "user1@test.com",
            password: "tester",
            refreshToken: testerAccessTokenInvalid
        })

        const user2 = await User.create({
            username: "user2",
            email: "user2@test.com",
            password: "tester",
            refreshToken: testerAccessTokenInvalid
        })

        setupGroupTxCat(user1, user2)

        await request(app)
        .get('/api/transactions/groups/group1')
        .set("Cookie", `accessToken=${testerAccessTokenInvalid}; refreshToken=${testerAccessTokenInvalid}`)
        .expect(401)
        .then(({ body }) => {
            expect(body.error).toEqual('Token is missing information');
        })
    
    })
    

    it('should return 200 and list of transactions of group', async () => {
        const user1Token = jwt.sign({
            email: "user1@test.com",
            username: "user1",
            role: "User"
        }, process.env.ACCESS_KEY, { expiresIn: '1y' })
        const user2Token = jwt.sign({
            email: "user2@test.com",
            username: "user2",
            role: "User"
        }, process.env.ACCESS_KEY, { expiresIn: '1y' })

        const user1 = await User.create({
            username: "user1",
            email: "user1@test.com",
            password: "tester",
            refreshToken: user1Token
        })

        const user2 = await User.create({
            username: "user2",
            email: "user2@test.com",
            password: "tester",
            refreshToken: user2Token
        })

        setupGroupTxCat(user1, user2)

        await request(app)
        .get('/api/groups/group1/transactions')
        .set("Cookie", `accessToken=${user1Token}; refreshToken=${user1Token}`)
        .expect(200)
        .then(({ body }) => {
            expect(body.data).toMatchObject([
                ({ username: user2.username, amount: 150, type: 'type1', date: '2023-05-12T16:30:00.000Z' }),
                ({ username: user1.username, amount: 50, type: 'type1', date: '2023-05-08T16:30:00.000Z' }),
            ]);
        })
    
    })

    it('should return an error message if there is an error', async () => {
        const user1Token = jwt.sign({
            email: "user1@test.com",
            username: "user1",
            role: "User"
        }, process.env.ACCESS_KEY, { expiresIn: '1y' })
        const user2Token = jwt.sign({
            email: "user2@test.com",
            username: "user2",
            role: "User"
        }, process.env.ACCESS_KEY, { expiresIn: '1y' })

        const user1 = await User.create({
            username: "user1",
            email: "user1@test.com",
            password: "tester",
            refreshToken: user1Token
        })

        const user2 = await User.create({
            username: "user2",
            email: "user2@test.com",
            password: "tester",
            refreshToken: user2Token
        })

        setupGroupTxCat(user1, user2)

        const mockError = new Error('Database connection failed');
        jest.spyOn(transactions, 'aggregate').mockImplementationOnce(() => Promise.reject(mockError));
        
        await request(app)
        .get('/api/groups/group1/transactions')
        .set("Cookie", `accessToken=${user1Token}; refreshToken=${user1Token}`)
            .then((response) => {
                expect(response.status).toBe(500)
                expect(response.body.error).toEqual('Database connection failed')
            })

        jest.resetAllMocks();
    })

})

describe("getTransactionsByGroupByCategory", () => {

    const setupGroupTxCat = async (user1, user2) => {
        Group.create({ 
            name: 'group1',
            members: [
                { user: user1._id, email: user1.email },
                { user: user2._id, email: user2.email },
            ],
        })
        await categories.create({ type: 'type1', color: '#ffaacc' });

        const txs = await transactions.create([
            ({ username: user1.username, amount: 50, type: 'type1', date: new Date('2023-05-08T16:30:00.000Z') }),
            ({ username: user2.username, amount: 150, type: 'type1', date: new Date('2023-05-08T16:30:00.000Z') }),
        ]).then(txs => txs.map(t => t.toJSON()));

        return {txs}
    }

    it('should return 400 and message if group is not verified', async () => {

        await request(app)
        .get('/api/transactions/groups/group1/category/type1')
        .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
        .expect(400)
        .then(({ body }) => {
            expect(body.error).toEqual('Group not found');
        })
    
    })

    it('should return 401 and message if group member(s) is/(are) not verified', async () => {
        const testerAccessTokenInvalid = jwt.sign({
            email: "",
            username: "user1",
            role: "User"
        }, process.env.ACCESS_KEY, { expiresIn: '1y' })

        const user1 = await User.create({
            username: "user1",
            email: "user1@test.com",
            password: "tester",
            refreshToken: testerAccessTokenInvalid
        })

        const user2 = await User.create({
            username: "user2",
            email: "user2@test.com",
            password: "tester",
            refreshToken: testerAccessTokenInvalid
        })

        setupGroupTxCat(user1, user2)

        await request(app)
        .get('/api/transactions/groups/group1/category/type1')
        .set("Cookie", `accessToken=${testerAccessTokenInvalid}; refreshToken=${testerAccessTokenInvalid}`)
        .expect(401)
        .then(({ body }) => {
            expect(body.error).toEqual('Token is missing information');
        })
    
    })

    it('should return 400 and error message is category is not found', async () => {
        const user1Token = jwt.sign({
            email: "user1@test.com",
            username: "user1",
            role: "User"
        }, process.env.ACCESS_KEY, { expiresIn: '1y' })
        const user2Token = jwt.sign({
            email: "user2@test.com",
            username: "user2",
            role: "User"
        }, process.env.ACCESS_KEY, { expiresIn: '1y' })

        const user1 = await User.create({
            username: "user1",
            email: "user1@test.com",
            password: "tester",
            refreshToken: user1Token
        })

        const user2 = await User.create({
            username: "user2",
            email: "user2@test.com",
            password: "tester",
            refreshToken: user2Token
        })

        setupGroupTxCat(user1, user2)

        await transactions.create([
            ({ username: user1.username, amount: 50, type: 'type2', date: new Date('2023-05-08T16:30:00.000Z') }),
            ({ username: user2.username, amount: 150, type: 'type2', date: new Date('2023-05-08T16:30:00.000Z') }),
        ])
        
        await request(app)
        .get('/api/groups/group1/transactions/category/wrongType')
        .set("Cookie", `accessToken=${user1Token}; refreshToken=${user1Token}`)
        .expect(400)
        .then(({ body }) => {
            expect(body.error).toEqual('Category not found')
        })
    
    })

    it('[admin] should return 200 and empty array if group has no members', async () => {
        const admin = await User.create({
            password: "tester",
            email: "tester@test.com",
            username: "admin",
            refreshToken: adminAccessTokenValid
        })

        Group.create({ 
            name: 'emptyGroup',
            members: [],
        })

        await categories.create({ type: 'type1', color: '#ffaacc' });

        await request(app)
        .get("/api/transactions/groups/emptyGroup/category/type1")
        .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
        .expect(200)
        .then(({ body }) => {            
            expect(body.data).toEqual([]);
        })

    })


    it('should return 200 and transaction list of group by category', async () => {
        const user1Token = jwt.sign({
            email: "user1@test.com",
            username: "user1",
            role: "User"
        }, process.env.ACCESS_KEY, { expiresIn: '1y' })
        const user2Token = jwt.sign({
            email: "user2@test.com",
            username: "user2",
            role: "User"
        }, process.env.ACCESS_KEY, { expiresIn: '1y' })

        const user1 = await User.create({
            username: "user1",
            email: "user1@test.com",
            password: "tester",
            refreshToken: user1Token
        })

        const user2 = await User.create({
            username: "user2",
            email: "user2@test.com",
            password: "tester",
            refreshToken: user2Token
        })
        await categories.create({ type: 'type2', color: 'blue' });

        setupGroupTxCat(user1, user2)
        await transactions.deleteMany({})
        const txs = await transactions.create([
            ({ username: user1.username, amount: 50, type: 'type2', date: new Date('2023-05-12T16:30:00.000Z') }),
            ({ username: user2.username, amount: 150, type: 'type2', date: new Date('2023-05-08T16:30:00.000Z') }),
        ])
        
        await request(app)
        .get('/api/groups/group1/transactions/category/type2')
        .set("Cookie", `accessToken=${user1Token}; refreshToken=${user1Token}`)
        .expect(200)
        .then(({ body }) => {
            expect(body.data).toHaveLength(2)
            expect(body.data).toMatchObject([
                ({ username: user1.username, amount: 50, type: 'type2', date: '2023-05-12T16:30:00.000Z' }),
                ({ username: user2.username, amount: 150, type: 'type2', date: '2023-05-08T16:30:00.000Z' }),
            ]);
        })
    
    })

    it('should return an error message if there is an error', async () => {
        const user1Token = jwt.sign({
            email: "user1@test.com",
            username: "user1",
            role: "User"
        }, process.env.ACCESS_KEY, { expiresIn: '1y' })
        const user2Token = jwt.sign({
            email: "user2@test.com",
            username: "user2",
            role: "User"
        }, process.env.ACCESS_KEY, { expiresIn: '1y' })

        const user1 = await User.create({
            username: "user1",
            email: "user1@test.com",
            password: "tester",
            refreshToken: user1Token
        })

        const user2 = await User.create({
            username: "user2",
            email: "user2@test.com",
            password: "tester",
            refreshToken: user2Token
        })

        setupGroupTxCat(user1, user2)

        const mockError = new Error('Database connection failed');
        jest.spyOn(transactions, 'aggregate').mockImplementationOnce(() => Promise.reject(mockError));
        
        await request(app)
        .get('/api/groups/group1/transactions/category/type1')
        .set("Cookie", `accessToken=${user1Token}; refreshToken=${user1Token}`)
            .then((response) => {
                expect(response.status).toBe(500)
                expect(response.body.error).toEqual('Database connection failed')
            })

        jest.resetAllMocks();
    })
})

describe("deleteTransaction", () => {
    const setup = async () => {
        const user1 = await User.create({
            username: "admin",
            email: "tester@test.com",
            password: "admin",
            role: 'Admin',
            refreshToken: adminAccessTokenValid
        })
        await categories.create([
            { type: 'type1', color: '#fac' },
            { type: 'type2', color: '#eba' }
        ]);
        const txs = await transactions.create([
            { username: user1.username, amount: 10, type: 'type1', date: new Date() },
            { username: user1.username, amount: 45, type: 'type1', date: new Date() },
            { username: user1.username, amount: 100, type: 'type2', date: new Date() },
        ]).then(txs => txs.map(t => t.toJSON()));

        return {user1, txs}
    }

    it("should return 401 and error message if validation fails", async () => {
        const user1 = {
            username: "admin",
            email: "tester@test.com",
            password: "admin",
            role: 'Admin',
            refreshToken: adminAccessTokenValid
        }
        await request(app)
            .delete("/api/users/admin/transactions")
            .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
            .send({ _id: '' })
            .then((response) => {
                expect(response.status).toBe(400)
                expect(response.body.error).toEqual('validation error')

            })

    })

    it("should return 401 and error message if auth fails", async () => {
        await User.create({
            username: "user1",
            email: "user1@test.com",
            password: "tester",
            role: 'User',
            refreshToken: testerAccessTokenValid
        })
        const { _, txs} = await setup();

        await request(app)
            .delete("/api/users/user1/transactions")
            .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
            .send({ _id: txs[0]._id })
            .then((response) => {
                expect(response.status).toBe(401)
                expect(response.body.error).toEqual('Mismatched username')
            })
    })

    it("should return 400 and error message if user is not found", async () => {
        const user1 = {
            username: "admin",
            email: "tester@test.com",
            password: "admin",
            role: 'Admin',
            refreshToken: adminAccessTokenValid
        }
        await categories.create([
            { type: 'type1', color: '#fac' },
            { type: 'type2', color: '#eba' }
        ]);
        const txs = await transactions.create([
            { username: user1.username, amount: 10, type: 'type1', date: new Date() },
            { username: user1.username, amount: 45, type: 'type1', date: new Date() },
            { username: user1.username, amount: 100, type: 'type2', date: new Date() },
        ]).then(txs => txs.map(t => t.toJSON()));

        await request(app)
            .delete("/api/users/admin/transactions")
            .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
            .send({ _id: txs[0]._id })
            .then((response) => {
                expect(response.status).toBe(400)
                expect(response.body.error).toEqual('user not found')
            })
    })

    it("should return 400 and error message if transaction is not found", async () => {
        await setup();

        await request(app)
            .delete("/api/users/admin/transactions")
            .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
            .send({ _id: new ObjectID("647adc50041efcd088945285")})
            .then((response) => {
                expect(response.status).toBe(400)
                expect(response.body.error).toEqual('transaction not found')
            })
    })

    it("should return 400 and error message if usernames don't match", async () => {
        await setup();

        const newTx = await transactions.create([
            { username: 'another user', amount: 10, type: 'type1', date: new Date() },
        ]).then(newTx => newTx.map(t => t.toJSON()));

        await request(app)
            .delete("/api/users/admin/transactions")
            .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
            .send({ _id: newTx[0]._id})
            .then((response) => {
                expect(response.status).toBe(400)
                expect(response.body.error).toEqual('Username mismatch')
            })
    })

    it("should return 200 and message if transaction was successfully deleted", async () => {
        const { txs} = await setup();

        await request(app)
            .delete("/api/users/admin/transactions")
            .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
            .send({ _id: txs[0]._id})
            .then((response) => {
                expect(response.status).toBe(200)
                //TODO: check if this structure is correct
                expect(response.body.data.message).toEqual('transaction deleted')
            })
        const remaining = await transactions.find().then(remaining => remaining.map(t => t.toJSON()));
        expect(remaining).toHaveLength(2)
    })

    it("should return 500 and error message if there was an error", async () => {
        const { txs} = await setup();
        
        const mockError = new Error('Database connection failed');
        jest.spyOn(transactions, 'deleteOne').mockImplementationOnce(() => Promise.reject(mockError));

        await request(app)
            .delete("/api/users/admin/transactions")
            .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
            .send({ _id: txs[0]._id})
            .then((response) => {
                expect(response.status).toBe(500)
                expect(response.error.message).toEqual('cannot DELETE /api/users/admin/transactions (500)')
            })

        jest.resetAllMocks()
    })
})

describe("deleteTransactions", () => {
    const setup = async () => {
        const user1 = await User.create({
            username: "admin",
            email: "tester@test.com",
            password: "admin",
            role: 'Admin',
            refreshToken: adminAccessTokenValid
        })
        await categories.create([
            { type: 'type1', color: '#fac' },
            { type: 'type2', color: '#eba' }
        ]);
        const txs = await transactions.create([
            { username: user1.username, amount: 10, type: 'type1', date: new Date() },
            { username: user1.username, amount: 45, type: 'type1', date: new Date() },
            { username: user1.username, amount: 100, type: 'type2', date: new Date() },
        ]).then(txs => txs.map(t => t.toJSON()));

        return {user1, txs}
    }

    it("should return 401 and error message if auth fails", async () => {
        await User.create({
            username: "user1",
            email: "user1@test.com",
            password: "tester",
            role: 'User',
            refreshToken: testerAccessTokenValid
        })
        const { _, txs} = await setup();

        await request(app)
            .delete("/api/transactions")
            .set("Cookie", `accessToken=${testerAccessTokenValid}; refreshToken=${testerAccessTokenValid}`)
            .send({ _ids: [txs[0]._id, ]})
            .then((response) => {
                expect(response.status).toBe(401)
                expect(response.body.error).toEqual('Mismatched role')
            })
    })

    it("should return 401 and error message if validation fails", async () => {


        await request(app)
        .delete("/api/transactions")
        .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
        .send({})
            .then((response) => {
                expect(response.status).toBe(400)
                expect(response.body.error).toEqual('validation error')
            })
    })

    it("should return 400 and error message if not all transactions are found", async () => {

        const { _, txs} = await setup();

        await request(app)
            .delete("/api/transactions")
            .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
            .send({ _ids: [txs[0]._id, txs[1]._id, txs[2]._id, new ObjectID()]})
            .then((response) => {
                expect(response.status).toBe(400)
                expect(response.body.error).toEqual('some transactions are not found')
            })
    })

    it("should return 200 and message if transactions were deleted successfully", async () => {

        const { _, txs} = await setup();

        await request(app)
            .delete("/api/transactions")
            .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
            .send({ _ids: [txs[0]._id, txs[1]._id ]})
            .then((response) => {
                expect(response.status).toBe(200)
                expect(response.body.data.message).toEqual('transactions deleted')
            })
        const remaining = await transactions.find().then(remaining => remaining.map(t => t.toJSON()));
        expect(remaining).toHaveLength(1)
    })

    it("should return 500 and error message if there was an error", async () => {
        const { txs} = await setup();
        
        const mockError = new Error('Database connection failed');
        jest.spyOn(transactions, 'deleteMany').mockImplementationOnce(() => Promise.reject(mockError));

        await request(app)
            .delete("/api/transactions")
            .set("Cookie", `accessToken=${adminAccessTokenValid}; refreshToken=${adminAccessTokenValid}`)
            .send({ _ids: [txs[0]._id, txs[1]._id ]})
            .then((response) => {
                expect(response.status).toBe(500)
                expect(response.error.message).toEqual('cannot DELETE /api/transactions (500)')
            })

        jest.resetAllMocks()
    })
})
