const Booking = require('../models/booking');
const Campground = require('../models/campground');

// Check availability for a campground on given dates
module.exports.checkAvailability = async (req, res) => {
    try {
        const { campgroundId, checkInDate, checkOutDate } = req.body;
        
        const checkIn = new Date(checkInDate);
        const checkOut = new Date(checkOutDate);

        // Find all confirmed bookings that overlap with the requested dates
        const conflictingBookings = await Booking.find({
            campground: campgroundId,
            status: 'confirmed',
            checkInDate: { $lt: checkOut },
            checkOutDate: { $gt: checkIn }
        });

        const isAvailable = conflictingBookings.length === 0;
        
        res.json({ 
            available: isAvailable,
            conflictingBookings: conflictingBookings.length
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Create a new booking
module.exports.createBooking = async (req, res, next) => {
    try {
        const { campgroundId, checkInDate, checkOutDate } = req.body;
        
        const checkIn = new Date(checkInDate);
        const checkOut = new Date(checkOutDate);

        // Validate dates
        if (checkIn >= checkOut) {
            req.flash('error', 'Check-out date must be after check-in date');
            return res.redirect(`/campgrounds/${campgroundId}`);
        }

        if (checkIn < new Date()) {
            req.flash('error', 'Check-in date cannot be in the past');
            return res.redirect(`/campgrounds/${campgroundId}`);
        }

        // Check for conflicting bookings
        const conflictingBookings = await Booking.find({
            campground: campgroundId,
            status: 'confirmed',
            checkInDate: { $lt: checkOut },
            checkOutDate: { $gt: checkIn }
        });

        if (conflictingBookings.length > 0) {
            req.flash('error', 'These dates are not available. Please choose different dates.');
            return res.redirect(`/campgrounds/${campgroundId}`);
        }

        // Get campground to calculate price
        const campground = await Campground.findById(campgroundId);
        if (!campground) {
            req.flash('error', 'Campground not found');
            return res.redirect('/campgrounds');
        }

        // Calculate number of nights and total price
        const numberOfNights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
        const totalPrice = numberOfNights * (campground.priceAmount || 0);

        // Create booking
        const booking = new Booking({
            user: req.user._id,
            campground: campgroundId,
            checkInDate: checkIn,
            checkOutDate: checkOut,
            numberOfNights,
            totalPrice
        });

        await booking.save();

        // Add booking to campground
        campground.bookings.push(booking._id);
        await campground.save();

        req.flash('success', `Successfully booked ${campground.title} for ${numberOfNights} night(s)!`);
        res.redirect(`/campgrounds/${campgroundId}`);
    } catch (err) {
        next(err);
    }
};

// Get all bookings for the logged-in user
module.exports.getUserBookings = async (req, res, next) => {
    try {
        const bookings = await Booking.find({ user: req.user._id })
            .populate('campground')
            .sort({ createdAt: -1 });

        res.render('bookings/my-bookings', { bookings });
    } catch (err) {
        next(err);
    }
};

// Get all bookings for a specific campground (for the owner)
module.exports.getCampgroundBookings = async (req, res, next) => {
    try {
        const { campgroundId } = req.params;
        
        const campground = await Campground.findById(campgroundId).populate('author');

        if (!campground) {
            req.flash('error', 'Campground not found');
            return res.redirect('/campgrounds');
        }

        // Check if user is the owner
        if (!req.user.isAdmin && !campground.author._id.equals(req.user._id)) {
            req.flash('error', 'You do not have permission to view these bookings');
            return res.redirect(`/campgrounds/${campgroundId}`);
        }

        const bookings = await Booking.find({ campground: campgroundId })
            .populate('user')
            .populate('campground')
            .sort({ checkInDate: 1 });

        res.render('bookings/campground-bookings', { bookings, campground });
    } catch (err) {
        next(err);
    }
};

// Cancel a booking (owner cancels user's booking)
module.exports.cancelBooking = async (req, res, next) => {
    try {
        const { bookingId } = req.params;
        const { cancellationReason } = req.body;

        const booking = await Booking.findById(bookingId)
            .populate('user');

        if (!booking) {
            req.flash('error', 'Booking not found');
            return res.redirect('/campgrounds');
        }

        // Populate campground with author
        const campground = await Campground.findById(booking.campground).populate('author');
        
        if (!campground) {
            req.flash('error', 'Campground not found');
            return res.redirect('/campgrounds');
        }

        // Check if user is the owner of the campground
        if (!req.user.isAdmin && !campground.author._id.equals(req.user._id)) {
            req.flash('error', 'You do not have permission to cancel this booking');
            return res.redirect(`/campgrounds/${campground._id}`);
        }

        if (booking.status === 'cancelled') {
            req.flash('error', 'This booking is already cancelled');
            return res.redirect(`/bookings/campground/${campground._id}`);
        }

        // Cancel the booking
        booking.status = 'cancelled';
        booking.cancellationReason = cancellationReason;
        booking.cancelledAt = new Date();
        await booking.save();

        req.flash('success', `Booking cancelled successfully. Reason: ${cancellationReason}`);
        res.redirect(`/bookings/campground/${campground._id}`);
    } catch (err) {
        next(err);
    }
};

// User cancels their own booking
module.exports.cancelUserBooking = async (req, res, next) => {
    try {
        const { bookingId } = req.params;
        const { cancellationReason } = req.body;

        const booking = await Booking.findById(bookingId).populate('campground');

        if (!booking) {
            req.flash('error', 'Booking not found');
            return res.redirect('/bookings/my-bookings');
        }

        // Check if user is the booking owner
        if (!booking.user.equals(req.user._id)) {
            req.flash('error', 'You do not have permission to cancel this booking');
            return res.redirect('/bookings/my-bookings');
        }

        if (booking.status === 'cancelled') {
            req.flash('error', 'This booking is already cancelled');
            return res.redirect('/bookings/my-bookings');
        }

        // Cancel the booking
        booking.status = 'cancelled';
        booking.cancellationReason = cancellationReason || 'Cancelled by user';
        booking.cancelledAt = new Date();
        await booking.save();

        req.flash('success', 'Your booking has been cancelled');
        res.redirect('/bookings/my-bookings');
    } catch (err) {
        next(err);
    }
};
