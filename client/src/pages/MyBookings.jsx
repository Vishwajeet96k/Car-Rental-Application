import React, { useEffect, useState } from "react";
import { assets } from "../assets/assets";
import Title from "../components/Title";
import { useAppContext } from "../context/AppContext";
import toast from "react-hot-toast";
import { motion } from "motion/react";

const MyBookings = () => {
  const { axios, user, currency } = useAppContext();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState(null); // tracks which booking is being paid

  const fetchMyBookings = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get("/api/bookings/user");
      if (data.success) {
        setBookings(data.bookings);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  // ──────────────────────────────────────────────
  // Razorpay Payment Handler
  // ──────────────────────────────────────────────
  const handlePayment = async (booking) => {
    try {
      setPayingId(booking._id);

      // Step 1: Create a Razorpay order on the backend
      const { data } = await axios.post("/api/payment/create-order", {
        bookingId: booking._id,
      });

      if (!data.success) {
        toast.error(data.message);
        setPayingId(null);
        return;
      }

      const { order, bookingId } = data;

      // Step 2: Open Razorpay checkout popup
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: "Car Rental",
        description: `${booking.car.brand} ${booking.car.model} — Rental Payment`,
        image: booking.car.image,
        order_id: order.id,

        // Step 3: On successful payment, verify on the backend
        handler: async function (response) {
          try {
            const { data: verifyData } = await axios.post("/api/payment/verify", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              bookingId,
            });

            if (verifyData.success) {
              toast.success(verifyData.message);
              fetchMyBookings(); // Refresh — booking now shows "confirmed"
            } else {
              toast.error(verifyData.message);
            }
          } catch (err) {
            toast.error("Payment verification failed. Please contact support.");
          } finally {
            setPayingId(null);
          }
        },

        prefill: {
          name: user?.name || "",
          email: user?.email || "",
        },
        theme: {
          color: "#2563EB",
        },
        modal: {
          ondismiss: () => setPayingId(null),
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", function (response) {
        toast.error("Payment failed: " + response.error.description);
        setPayingId(null);
      });
      rzp.open();

    } catch (error) {
      toast.error(error.message);
      setPayingId(null);
    }
  };

  useEffect(() => {
    if (user) {
      fetchMyBookings();
    }
  }, [user]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="px-6 md:px-16 lg:px-24 xl:px-32 2xl:px-48 mt-16 text-sm max-w-7xl"
    >
      <Title title='MyBookings' subTitle='View and manage your all car bookings' align="left" />

      <div>
        {loading ? (
          <p className='mt-12 text-gray-500'>Loading bookings...</p>
        ) : bookings.length === 0 ? (
          <p className='mt-12 text-gray-500'>No bookings available</p>
        ) : bookings.map((booking, index) => (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
            key={booking._id}
            className='grid grid-cols-1 md:grid-cols-4 gap-6 p-6 border border-borderColor rounded-lg mt-5 first:mt-12'
          >

            {/* Car Image + Info */}
            <div className='md:col-span-1'>
              <div className='rounded-md overflow-hidden mb-3'>
                <img src={booking.car.image} alt="Car image" className='w-full h-auto aspect-video object-cover' />
              </div>
              <p className='text-lg font-medium mt-2'>{booking.car.brand} {booking.car.model}</p>
              <p className='text-gray-500'>{booking.car.year} • {booking.car.category} • {booking.car.location}</p>
            </div>

            {/* Booking Info */}
            <div className='md:col-span-2'>
              <div className='flex items-center gap-2'>
                <p className='px-3 py-1.5 bg-light rounded'>Booking #{index + 1}</p>
                <p className={`px-3 py-1 text-xs rounded-full ${
                  booking.status === 'confirmed'
                    ? 'bg-green-400/15 text-green-600'
                    : booking.status === 'cancelled'
                    ? 'bg-red-400/15 text-red-600'
                    : 'bg-yellow-400/15 text-yellow-600'
                }`}>
                  {booking.status}
                </p>
              </div>

              <div className='flex items-start gap-2 mt-3'>
                <img src={assets.calendar_icon_colored} alt="Calendar Icon" className='w-4 h-4 mt-1' />
                <div>
                  <p className='text-gray-500'>Rental Period</p>
                  <p>{booking.pickupDate.split('T')[0]} To {booking.returnDate.split('T')[0]}</p>
                </div>
              </div>

              <div className='flex items-start gap-2 mt-3'>
                <img src={assets.location_icon_colored} alt="Location Icon" className='w-4 h-4 mt-1' />
                <div>
                  <p className='text-gray-500'>Pickup Location</p>
                  <p>{booking.car.location}</p>
                </div>
              </div>
            </div>

            {/* Price + Pay Now */}
            <div className='md:col-span-1 flex flex-col justify-between gap-4'>

              <div className='text-sm text-gray-500 text-right'>
                <p>Total Price</p>
                <h1 className='text-2xl font-semibold text-primary'>{currency}{booking.price}</h1>
                <p>Booked on {booking.createdAt.split('T')[0]}</p>
              </div>

              {/* ── Pay Now button: only if unpaid & not cancelled ── */}
              {booking.paymentStatus !== 'paid' && booking.status !== 'cancelled' && (
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handlePayment(booking)}
                  disabled={payingId === booking._id}
                  className='w-full bg-primary hover:bg-primary-dull transition-all py-2.5 font-medium text-white rounded-xl cursor-pointer text-sm disabled:opacity-60 disabled:cursor-not-allowed'
                >
                  {payingId === booking._id ? "Processing..." : `Pay Now ₹${booking.price}`}
                </motion.button>
              )}

              {/* ── Paid badge: shown when payment is done ── */}
              {booking.paymentStatus === 'paid' && (
                <p className='text-right text-xs text-green-600 font-semibold bg-green-50 px-3 py-2 rounded-xl border border-green-100'>
                  ✓ Payment Complete
                </p>
              )}

            </div>

          </motion.div>
        ))}
      </div>

    </motion.div>
  );
};

export default MyBookings;
