import { Router } from "express";
import { createExpense, deleteExpense, listExpenses } from "../controllers/expenseController.js";

export const expenseRouter = Router();
expenseRouter.get("/", listExpenses);
expenseRouter.post("/", createExpense);
expenseRouter.delete("/:id", deleteExpense);
