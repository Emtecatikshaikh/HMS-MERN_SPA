const fs = require('fs')
const uuid = require('uuid');
const { validationResult } = require('express-validator')

const HttpError = require('../models/http-error');
const getCoordsForAddress = require('../utils/location')
const Place = require('../models/place')
const User = require('../models/user');
const { default: mongoose } = require('mongoose');

// let DUMMY_PLACES = [
//   {
//     id: 'p1',
//     title: 'Empire State Building',
//     description: 'One of the most famous sky scrapers in the world!',
//     location: {
//       lat: 40.7484474,
//       lng: -73.9871516
//     },
//     address: '20 W 34th St, New York, NY 10001',
//     creator: 'u1'
//   }
// ];

const getPlaceById = async (req, res, next) => {
  const placeId = req.params.pid; // { pid: 'p1' }

  // const place = DUMMY_PLACES.find(p => {
  //   return p.id === placeId;
  // });

  let place
  try{
    place = await Place.findById(placeId) //Static Method
  }catch(err){
    const error = new HttpError(
      'Something went wrong, could not find the place',500 
    )
      return next(error)
  }

  if (!place) {
    const error = new HttpError('Could not find a place for the provided id.', 404);
    return next(error)
  }

  res.json({ place: place.toObject({ getters: true}) }); // => { place } => { place: place }
};

// function getPlaceById() { ... }
// const getPlaceById = function() { ... }

const getPlacesByUserId = async (req, res, next) => {
  const userId = req.params.uid;

  // let places
  let userWithPlaces
  try{
    // places = await Place.find({ creator: userId })
    userWithPlaces = await User.findById(userId).populate('places')
  }catch(err){
    const error = new HttpError(
      'Fetching places failed, please try again later',500
    )
    return next(error)
  }
  
  // const places = DUMMY_PLACES.filter(p => {
  //   return p.creator === userId;
  // });
  // if(!places || places.length === 0) {}
  if (!userWithPlaces || userWithPlaces.places.length === 0) {
    return next(
      new HttpError('Could not find places for the provided user id.', 404)
    );
  }

  res.json({ places: userWithPlaces.places.map(place => place.toObject({ getters:true})) });
};

const createPlace = async (req, res, next) => {
  const errors = validationResult(req) 
  if(!errors.isEmpty()){
    // console.log(errors) 
    // res.status(422)
    return next(new HttpError('Invalid inputs passed please check ur data',422))
  }

  const { title, description, address } = req.body;
  // const title = req.body.title;

  let coordinates;
  try{
     coordinates = await getCoordsForAddress(address)
  } catch(error){
    return next(error)
  }

  const createdPlace = new Place({
    title,
    description,
    address,
    location: coordinates,
    image: req.file.path,
    // 'https://images.barrons.com/im-301332?width=620&size=1.5&pixel_ratio=1.5',
    creator: req.userData.userId
  })
  
  // {
  //   id: uuid.v4(),
  //   title,
  //   description,
  //   location: coordinates,
  //   address,
  //   creator
  // };

  let user
  try{
    user = await User.findById(req.userData.userId)
  }catch(err){
    const error = new HttpError(
      'Creating place failed !',500
    )
    return next(error)
  }

  if(!user){
    const error = new HttpError(
      'Could not find user for provided id',404
    )
    return next(error)
  }

  console.log(user)

    try{
      // await createdPlace.save()
      const sess = await mongoose.startSession()
      sess.startTransaction()
      await createdPlace.save({ session: sess })
      user.places.push(createdPlace) // not a std push fn for arrays

      await user.save({ session: sess })
      await sess.commitTransaction()

    }catch(err){
      const error = new HttpError(
        'Creating place failed, please try again.',500
      )
      return next(error)
    }
  // DUMMY_PLACES.push(createdPlace); //unshift(createdPlace)

  res.status(201).json({place: createdPlace});
};

const updatePlace = async (req,res,next) => {
  const errors = validationResult(req) 
  if(!errors.isEmpty()){
    // console.log(errors) 
    // res.status(422)
    return next( 
      new HttpError('Invalid inputs passed please check ur data',422)
    )
  }

  const { title, description } = req.body;
  const placeId = req.params.pid

  let place;
  try{
    place = await Place.findById(placeId)
  }catch(err){
    const error = new HttpError(
      'Something went wrong. Could not update place',500
    )
    return next(error)
  }

  // const updatedPlace = { ...DUMMY_PLACES.find(p => p.id === placeId)}
  // const placeIndex = DUMMY_PLACES.findIndex(p => p.id === placeId)

  if(place.creator.toString() !== req.userData.userId){
    const error = new HttpError(
      'You are not allowed to edit this place !',
      401
    )
    return next(error)
  }

  place.title = title
  place.description = description

  try{
      await place.save()
  }catch(err){
    const error = new HttpError(
      'Something went wrong, could not update place',500
    )
    return next(error)
  }

  // DUMMY_PLACES[placeIndex] = updatedPlace
  res.status(200).json({place: place.toObject({ getters: true })})
}

const deletePlace = async (req,res,next) => {
  const placeId = req.params.pid
  let place
  try{
    place = await Place.findById(placeId).populate('creator') // populate refers to external linked doc and look for it 
  }catch(err){
    const error = new HttpError(
      'Could not delete the place',500
    )
    return next(error)
  }

  if(!place){
    const error = new HttpError(
      'Could not find the place to be deleted ',404
    )
    return next(error)
  }

  if(place.creator.id !== req.userData.userId){
    const error = new HttpError(
      'You are not allowed to delete this place !',
      401
    )
    return next(error)
  }

  const imagePath = place.image

  try{
    const sess = await mongoose.startSession()
    sess.startTransaction()
    await place.remove({ session: sess })
    place.creator.places.pull(place)
    await place.creator.save({ session: sess })
    await sess.commitTransaction()

    // await place.remove()
  }catch(err){
    const error = new HttpError(
      'Something went wrong ! Could not delete the place',500
    )
    return next(error)
  }
  // if(!DUMMY_PLACES.find(p => p.id === placeId )) {
  //   throw new HttpError('Could not find a place to delete', 404)
  // }

  fs.unlink(imagePath, err => {
    console.log(err)
  }) // Deleting the image using unlink meth of fs
  
  // DUMMY_PLACES = DUMMY_PLACES.filter( p => p.id !== placeId )
  res.status(200).json({message: 'Deleted Place.'})
}

exports.getPlaceById = getPlaceById;
exports.getPlacesByUserId = getPlacesByUserId;
exports.createPlace = createPlace;
exports.updatePlace = updatePlace;
exports.deletePlace = deletePlace;