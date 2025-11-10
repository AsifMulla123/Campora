// schemas.js
const Joi = require('joi');

module.exports.campgroundSchema = Joi.object({
  campground: Joi.object({
    title: Joi.string().required().trim().messages({
      'string.empty': 'Title is required',
      'any.required': 'Title is required'
    }),
    price: Joi.string().required().valid('free', 'paid'),
    priceAmount: Joi.number().when('price', {
      is: 'paid',
      then: Joi.number().required().min(0.01).messages({
        'number.min': 'Price must be at least $0.01',
        'any.required': 'Price is required when paid option is selected'
      }),
      otherwise: Joi.number().optional().allow(null, '')
    }).allow(null, ''),
    location: Joi.string().required().trim().messages({
      'string.empty': 'Location is required',
      'any.required': 'Location is required'
    }),
    description: Joi.string().allow('', null),
    latitude: Joi.number().min(-90).max(90).required().messages({
      'number.min': 'Latitude must be between -90 and 90',
      'number.max': 'Latitude must be between -90 and 90',
      'any.required': 'Latitude is required'
    }),
    longitude: Joi.number().min(-180).max(180).required().messages({
      'number.min': 'Longitude must be between -180 and 180',
      'number.max': 'Longitude must be between -180 and 180',
      'any.required': 'Longitude is required'
    })
  }).required()
});

module.exports.reviewSchema = Joi.object({
  review: Joi.object({
    rating: Joi.number().required().min(1).max(5),
    body: Joi.string().required()
  }).required()
});
