const express = require('express');
const router = express.Router();
const bookings = require('../controllers/bookings');
const catchAsync = require('../utils/catchAsync');
const { isLoggedIn } = require('../middleware');

// Check availability (AJAX endpoint)
router.post('/check-availability', catchAsync(bookings.checkAvailability));

// Create a booking
router.post('/create', isLoggedIn, catchAsync(bookings.createBooking));

// Get user's bookings
router.get('/my-bookings', isLoggedIn, catchAsync(bookings.getUserBookings));

// Get campground bookings (for owner)
router.get('/campground/:campgroundId', isLoggedIn, catchAsync(bookings.getCampgroundBookings));

// Cancel booking (owner cancels)
router.post('/:bookingId/cancel', isLoggedIn, catchAsync(bookings.cancelBooking));

// Cancel user's own booking
router.post('/:bookingId/cancel-booking', isLoggedIn, catchAsync(bookings.cancelUserBooking));

module.exports = router;
