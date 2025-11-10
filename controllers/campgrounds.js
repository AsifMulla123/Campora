const Campground = require('../models/campground');
const { cloudinary } = require("../cloudinary");

// Optional: fallback geocoder stub if Mapbox token not set
let geocoder;
if (process.env.MAPBOX_TOKEN) {
  const mbxGeocoding = require('@mapbox/mapbox-sdk/services/geocoding');
  geocoder = mbxGeocoding({ accessToken: process.env.MAPBOX_TOKEN });
} else {
  console.warn('MAPBOX_TOKEN not set — geocoding disabled.');
  geocoder = {
    forwardGeocode: () => ({
      send: async () => ({ body: { features: [] } })
    })
  };
}

// =====================================
// INDEX — list all campgrounds
// =====================================
module.exports.index = async (req, res) => {
  const campgrounds = await Campground.find({});
  res.render('campgrounds/index', { campgrounds });
};

// =====================================
// RENDER NEW FORM
// =====================================
module.exports.renderNewForm = (req, res) => {
  let campground = req.session.formData || {};
  if (req.session.formData) {
    delete req.session.formData;
  }
  res.render('campgrounds/new', { campground });
};

// =====================================
// CREATE CAMPGROUND
// =====================================
module.exports.createCampground = async (req, res, next) => {
  try {
    const campground = new Campground(req.body.campground);

    // ✅ Parse numeric latitude & longitude
    const lat = parseFloat(req.body.campground.latitude);
    const lng = parseFloat(req.body.campground.longitude);

    // ✅ If user entered both lat/lng, use them
    if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
      campground.geometry = {
        type: 'Point',
        coordinates: [lng, lat] // GeoJSON requires [longitude, latitude]
      };
    } else {
      // ✅ Otherwise, fallback to geocoding or default location
      const geoData = await geocoder.forwardGeocode({
        query: req.body.campground.location || '',
        limit: 1
      }).send();

      if (geoData.body.features && geoData.body.features.length > 0) {
        campground.geometry = geoData.body.features[0].geometry;
      } else {
        // Default to India center if nothing found
        campground.geometry = { type: 'Point', coordinates: [78, 20] };
      }
    }

    // ✅ Handle images
    campground.images = req.files.map(f => ({ url: f.path, filename: f.filename }));
    campground.author = req.user._id;
    
    // ✅ Handle price - set priceAmount to 0 if free
    if (campground.price === 'free') {
      campground.priceAmount = 0;
    }

    await campground.save();
    console.log('✅ Saved campground with geometry:', campground.geometry);

    req.flash('success', 'Successfully made a new campground!');
    res.redirect(`/campgrounds/${campground._id}`);
  } catch (err) {
    console.error('❌ Error creating campground:', err);
    next(err);
  }
};


// =====================================
// SHOW CAMPGROUND
// =====================================
module.exports.showCampground = async (req, res) => {
  const campground = await Campground.findById(req.params.id)
    .populate({
      path: 'reviews',
      populate: { path: 'author' }
    })
    .populate('author');

  if (!campground) {
    req.flash('error', 'Cannot find that campground!');
    return res.redirect('/campgrounds');
  }

  // Handle case where author was deleted
  if (!campground.author) {
    campground.author = { username: 'Deleted User', _id: null };
  }
  
  // Handle case where review authors were deleted
  if (campground.reviews && campground.reviews.length > 0) {
    campground.reviews = campground.reviews.map(review => {
      if (!review.author) {
        review.author = { username: 'Deleted User', _id: null };
      }
      return review;
    });
  }

  res.render('campgrounds/show', { campground });
};

// =====================================
// RENDER EDIT FORM
// =====================================
module.exports.renderEditForm = async (req, res) => {
  const { id } = req.params;
  const campground = await Campground.findById(id);

  if (!campground) {
    req.flash('error', 'Cannot find that campground!');
    return res.redirect('/campgrounds');
  }
  
  // Check if user is admin or author
  if (!req.user.isAdmin && !campground.author.equals(req.user._id)) {
    req.flash('error', 'You do not have permission to do that!');
    return res.redirect(`/campgrounds/${id}`);
  }

  res.render('campgrounds/edit', { campground });
};

// =====================================
// UPDATE CAMPGROUND
// =====================================
module.exports.updateCampground = async (req, res) => {
  const { id } = req.params;
  const campground = await Campground.findById(id);
  
  // Check if user is admin or author
  if (!req.user.isAdmin && !campground.author.equals(req.user._id)) {
    req.flash('error', 'You do not have permission to do that!');
    return res.redirect(`/campgrounds/${id}`);
  }
  
  // ✅ Validate required fields
  const { title, location, latitude, longitude, price } = req.body.campground || {};
  if (!title || !location || latitude === undefined || longitude === undefined || !price) {
    req.flash('error', 'Please fill all required fields');
    return res.redirect(`/campgrounds/${id}/edit`);
  }
  
  const updatedCampground = await Campground.findByIdAndUpdate(id, { ...req.body.campground }, { new: true });

  // ✅ Handle price - set priceAmount to 0 if free
  if (updatedCampground.price === 'free') {
    updatedCampground.priceAmount = 0;
  }

  // ✅ If coordinates were provided in edit form, update geometry
  const lat = parseFloat(req.body.campground.latitude);
  const lng = parseFloat(req.body.campground.longitude);

  if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
    updatedCampground.geometry = { type: 'Point', coordinates: [lng, lat] };
  }

  // ✅ Handle newly uploaded images
  if (req.files && req.files.length) {
    const imgs = req.files.map(f => ({ url: f.path, filename: f.filename }));
    updatedCampground.images.push(...imgs);
  }

  // ✅ Handle image deletions
  if (req.body.deleteImages) {
    for (let filename of req.body.deleteImages) {
      await cloudinary.uploader.destroy(filename);
    }
    await updatedCampground.updateOne({
      $pull: { images: { filename: { $in: req.body.deleteImages } } }
    });
  }

  // ✅ Validate minimum 1 image remains
  const currentCampground = await Campground.findById(id);
  const totalImages = currentCampground.images.length;
  if (totalImages < 1) {
    req.flash('error', 'Campground must have at least 1 image');
    return res.redirect(`/campgrounds/${id}/edit`);
  }

  await updatedCampground.save();
  req.flash('success', 'Successfully updated campground!');
  res.redirect(`/campgrounds/${updatedCampground._id}`);
};

// =====================================
// DELETE CAMPGROUND
// =====================================
module.exports.deleteCampground = async (req, res) => {
  const { id } = req.params;
  const campground = await Campground.findById(id);
  
  // Check if user is admin or author
  if (!req.user.isAdmin && !campground.author.equals(req.user._id)) {
    req.flash('error', 'You do not have permission to do that!');
    return res.redirect(`/campgrounds/${id}`);
  }
  
  await Campground.findByIdAndDelete(id);
  req.flash('success', 'Successfully deleted campground');
  res.redirect('/campgrounds');
};

// =====================================
// MY CAMPGROUNDS - User's Listed Sites
// =====================================
module.exports.myCampgrounds = async (req, res, next) => {
  try {
    const campgrounds = await Campground.find({ author: req.user._id })
      .populate('bookings')
      .sort({ createdAt: -1 });
    
    // Get booking stats for each campground
    const Booking = require('../models/booking');
    const campgroundsWithStats = await Promise.all(
      campgrounds.map(async (campground) => {
        const totalBookings = await Booking.countDocuments({
          campground: campground._id,
          status: 'confirmed'
        });
        const pendingBookings = await Booking.countDocuments({
          campground: campground._id,
          status: 'confirmed'
        });
        return {
          ...campground.toObject(),
          totalBookings,
          pendingBookings
        };
      })
    );
    
    res.render('campgrounds/my-campgrounds', { campgrounds: campgroundsWithStats });
  } catch (err) {
    next(err);
  }
};
