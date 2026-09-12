const User = require("../models/User");
const Profile = require("../models/Profile");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const { sendSuccess } = require("../utils/ApiResponse");

const signup = asyncHandler(async (req,res)=>{
 const {name,email,password}=req.body; const normalized=email.toLowerCase();
 if(await User.findOneByEmail(normalized)) throw ApiError.conflict("An account with that email already exists");
 const user=await User.create({name,email:normalized,passwordHash:await User.hashPassword(password)});
 const profile=await Profile.create({user:user.id});
 sendSuccess(res,{statusCode:201,message:"Account created",data:{user:user.toSafeObject(),profile}});
});
const login=asyncHandler(async(req,res)=>{
 const {email,password}=req.body; const user=await User.findOneByEmail(email.toLowerCase(),true);
 if(!user || !(await user.comparePassword(password))) throw ApiError.unauthorized("Incorrect email or password");
 if(!user.isActive) throw ApiError.forbidden("This account has been deactivated");
 sendSuccess(res,{message:"Logged in",data:{user:user.toSafeObject()}});
});
const listUsers=asyncHandler(async(req,res)=>{const users=await User.list();sendSuccess(res,{message:"Users fetched",data:users,meta:{count:users.length}})});
const getUser=asyncHandler(async(req,res)=>{const user=await User.findById(req.params.id);if(!user)throw ApiError.notFound("User not found");sendSuccess(res,{message:"User fetched",data:user.toSafeObject()})});
const updateUser=asyncHandler(async(req,res)=>{const patch={};if(req.body.name!==undefined)patch.name=req.body.name;if(req.body.email!==undefined)patch.email=req.body.email.toLowerCase();if(req.body.isActive!==undefined)patch.isActive=req.body.isActive;try{const user=await User.update(req.params.id,patch);if(!user)throw ApiError.notFound("User not found");sendSuccess(res,{message:"User updated",data:user.toSafeObject()})}catch(e){if(e.code==="ER_DUP_ENTRY")throw ApiError.conflict("An account with that email already exists");throw e}});
const deleteUser=asyncHandler(async(req,res)=>{const user=await User.delete(req.params.id);if(!user)throw ApiError.notFound("User not found");sendSuccess(res,{message:"User deleted",data:{id:user.id}})});
module.exports={signup,login,listUsers,getUser,updateUser,deleteUser};
