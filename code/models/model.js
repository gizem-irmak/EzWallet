import mongoose from "mongoose";

const categories_model = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        default: "investment",
        unique: true
    },
    color: {
        type: String,
        required: true,
        default: "#fcbe44"
    }
},  {
    timestamps: true,
});

const transaction_model = new mongoose.Schema({
    username: {
        type: String,
        default: "Anonymous",
        required: true
    },
    type: {
        type: String,
        default: "investment",
        required: true
    },
    amount: {
        type: Number,
        default: 0,
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    }
})

const categories = mongoose.model("categories", categories_model);
const transactions = mongoose.model("transactions", transaction_model);

export { categories, transactions }

