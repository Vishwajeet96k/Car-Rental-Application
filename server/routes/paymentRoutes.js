import express from "express";
import { createOrder, verifyPayment } from "../controllers/paymentController.js";
import { protect } from "../middleware/auth.js";

const paymentRouter = express.Router();

// Create a Razorpay order for a booking
paymentRouter.post("/create-order", protect, createOrder);

// Verify payment signature and confirm the booking
paymentRouter.post("/verify", protect, verifyPayment);

export default paymentRouter;
