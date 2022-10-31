// const uuid = require('uuid');
const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/user");

const HttpError = require("../models/http-error");

// const DUMMY_USERS = [
//     {
//         id: 'u1',
//         name: 'Gogeta',
//         email: 'test@test.com',
//         password: '12345'
//     }
// ]

const getUsers = async (req, res, next) => {
  let users;
  try {
    users = await User.find({}, "-password");
  } catch (err) {
    const error = new HttpError("Fetching Users failed !", 500);
    return next(error);
  }
  res.json({ users: users.map((user) => user.toObject({ getters: true })) });

  // res.json({users: DUMMY_USERS})
};

const signup = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // console.log(errors)
    // res.status(422)
    return next(
      new HttpError("Invalid inputs passed please check ur data", 422)
    );
  }

  const { name, email, password } = req.body;
  // const hasUser = DUMMY_USERS.find(u => u.email === email)

  // if(hasUser){
  //     throw new HttpError('Could not create user, Email already exists', 422)
  // }
  let existingUser;
  try {
    existingUser = await User.findOne({ email: email });
  } catch (err) {
    const error = new HttpError("Signup Failed", 500);
    return next(error);
  }

  if (existingUser) {
    const error = new HttpError(
      "User already exists ! Please login instead",
      422
    );
    return next(error);
  }

  let hashedPassword;
  try {
    hashedPassword = await bcrypt.hash(password, 12);
  } catch (err) {
    const error = new HttpError("Could not create user, please try again", 500);
    return next(error);
  }

  const createdUser = new User({
    name,
    email,
    image: req.file.path,
    password: hashedPassword,
    places: [],
  });

  // const createdUser = {
  //     id: uuid.v4(),
  //     name, // name: name
  //     email,
  //     password
  // }

  try {
    await createdUser.save();
  } catch (err) {
    const error = new HttpError("Signing up failed, please try again.", 500);
    return next(error);
  }
  // DUMMY_USERS.push(createdUser)

  let token;
  try{
        token = jwt.sign(
        { userId: createdUser.id, email: createdUser.email },
        process.env.JWT_KEY,
        {expiresIn: '1h' }
        );
    }catch(err){
        const error = new HttpError("Signing up failed, please try again.", 500);
        return next(error);
    }

  res.status(201).json({ userId: createdUser.id, email: createdUser.email, token: token })
    // createdUser.toObject({ getters: true }) ;
};

const login = async (req, res, next) => {
  const { email, password } = req.body;

  // const identifiedUser = DUMMY_USERS.find(u => u.email === email)
  // if (!identifiedUser || identifiedUser.password !== password){
  //     throw new HttpError('Could not identify user, Credentials are wrong', 401)
  // }

  let existingUser;

  try {
    existingUser = await User.findOne({ email: email });
  } catch (err) {
    const error = new HttpError("Login Failed", 500);
    return next(error);
  }

  if (!existingUser) {
    const error = new HttpError(
      "Invalid Credentials Could not log you in",
      403
    );
    return next(error);
  }

  let isValidPassword = false;
  try {
    isValidPassword = await bcrypt.compare(password, existingUser.password);
  } catch (err) {
    const error = new HttpError(
      "Could not log you in, please check your credentials and try again",
      500
    );
    return next(error);
  }

  if (!isValidPassword) {
    const error = new HttpError(
      "Invalid Credentials Could not log you in",
      403
    );
    return next(error);
  }

  let token;
  try{
        token = jwt.sign(
        { userId: existingUser.id, email: existingUser.email },
        process.env.JWT_KEY,
        { expiresIn: '1h' }
        );
    }catch(err){
        const error = new HttpError("Logging in failed, please try again.", 500);
        return next(error);
    }

  res.json({
    // message: "Logged IN",
    // user: existingUser.toObject({ getters: true }),
    userId: existingUser.id ,
    email: existingUser.email ,
    token: token
  });
};

exports.getUsers = getUsers;
exports.signup = signup;
exports.login = login;
