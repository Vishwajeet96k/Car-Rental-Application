import Razorpay from "razorpay";
import crypto from "crypto";
import Booking from "../models/Booking.js";

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// API to create a Razorpay order for a booking
export const createOrder = async (req, res) => {
  try {
    const { bookingId } = req.body;
    const { _id } = req.user;

    // Fetch the booking and ensure it belongs to the logged-in user
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.json({ success: false, message: "Booking not found" });
    }

    if (booking.user.toString() !== _id.toString()) {
      return res.json({ success: false, message: "Unauthorized" });
    }

    if (booking.paymentStatus === "paid") {
      return res.json({ success: false, message: "Booking is already paid" });
    }

    // Razorpay expects amount in paise (1 INR = 100 paise)
    const amountInPaise = Math.round(booking.price * 100);

    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: `receipt_${bookingId}`,
    });

    // Save the Razorpay order ID to the booking
    booking.razorpayOrderId = order.id;
    await booking.save();

    res.json({
      success: true,
      order,
      bookingId: booking._id,
    });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// API to verify Razorpay payment signature and confirm the booking
export const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId } = req.body;

    // Generate expected HMAC-SHA256 signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.json({ success: false, message: "Payment verification failed. Invalid signature." });
    }

    // Signature matched — update booking to paid & confirmed
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.json({ success: false, message: "Booking not found" });
    }

    booking.paymentStatus = "paid";
    booking.status = "confirmed";
    await booking.save();

    res.json({ success: true, message: "Payment successful! Your booking is confirmed." });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};
