require('dotenv').config()
const express = require('express')
const router = express.Router()
const bcrypt = require('bcrypt')
const otpGenerator = require('otp-generator')
const nodemailer = require('nodemailer')
const Mailgen = require('mailgen')
const mongoose  = require('mongoose')
const moment = require('moment')


const us = require('../controllers/UserControll/user-side')
const orderModel = require('../models/order')
const userModel = require('../models/user')
const authGuard = require('../middlewares/user-Auth')
const productInHome = require('../controllers/UserControll/home-page-products')
const controller = require('../util/for-otp')
const products = require('../models/products')
const Fotp = require('../util/forgotPassword')
const userAccess = require('../middlewares/userSession')
const cartModel = require('../models/cartModel')
const pValidator = require('../util/passwordValidator')
const cart = require('../models/cartModel')
const razor = require('../middlewares/razorpay')
const coupon = require('../models/coupons')
const cartHelper = require('../helpers/cartHelper')
// const coupon = require('../models/coupons')









router.get('/',authGuard.userLoggedinAuthGuard,(req,res)=>{
    res.render('user/anonymous',{productInHome})
})
 
//user login-------------------------------------------------------------------------
router.get('/login',authGuard.userLoggedinAuthGuard,us.userLogin);

//user signup----------------------------------------------------------------------------------
router.get('/signup',authGuard.userLoggedinAuthGuard,us.userSignup)

//--------------------------------------------------------------------------------------------------------------------------//
//userHome
router.get('/userHome',authGuard.userLoginAuthGuard,userAccess,us.getHome)

//-------------------------------------------------------------------------------------------------------------------------------------------
//otp control---------------------------------------------------------
router.post('/otpsend',controller.otp);

//=----------==-----------------------=-------------------------------------=--------------------------------------------------------------------
//otp form--------
router.get('/otpsen',authGuard.userLoggedinAuthGuard,us.otpForm)
 
//--------------------------------------------------------------------------------------------------
//entering to home route --------------------===------------------=--------
router.post('/home',us.postEnteringHOme)

//====-----------------------------------------------------------------------------------------------------
//userloginbackend==---------------------------------------------------------------//-----------------------------------------------------------
router.post('/homed',us.userLoginBackend)

//----------------------------------------------------------------------------------------------------------------------------------------------------//
//logout
router.get('/logout',us.logout)
    
//--------------------------------------------------------------------------------------------------------------------------------------------------------------//
//product-list userside---------------------------------------------------------------------------------
router.get('/Product-list',authGuard.userLoginAuthGuard, userAccess, us.productList1)

//------------------------------------------------------------------------------------------------------------------------------------------
//============================================================================================================================================

//product detail page
router.route('/productDetail/:id',authGuard.userLoginAuthGuard,userAccess)
.get(us.producDetail)

//------------------------------------------------------------------------------------------------------------------------  
//user forgot password
router.route('/forgotPassword',authGuard.userLoggedinAuthGuard)
    .get(us.forgotPass)

router.post('/forgottenOtp',us.forgotOtp)

//---------------------------------------------------------------------------------------------------------------------------------
//otpGenerate
router.get('/forgotPasswordOtpGenerate',Fotp.Otp)

//========--------------------------------------------------------------------------------------------------------------------------------------
//otpForm
router.get('/updatePassword-1',authGuard.userLoggedinAuthGuard,us.passwordChange)

router.post('/FotpSmt',us.PassChecker)

//------password confirm
router.get('/pwConfirm',authGuard.userLoggedinAuthGuard,(req,res)=>{
    res.render('user/ConfirmPassword',{title:"Confirm Password"});
})

router.post('/confirmation-pass',us.getConfirmPass)
//===================================================================================================================
//resend otp
router.get('/resendOtp',us.pwSendOtp)

//==================================================================================================================================
//===========================================================================================================================
//add to cart
router.get('/addToCart/:id',us.userAddtoCart);

//============================================
//user cart
router.get('/cart',authGuard.userLoginAuthGuard,userAccess,us.userGetCart)

//cart quandity updation
router.post('/updateCartValue',us.cartQuantityUpdate)

//cart item deletion
router.put('/deleteCartItem/:cartId',us.cartItemDeletion)

//=============================================================================================================
//user profile========================================
router.get('/profile',authGuard.userLoginAuthGuard,userAccess,us.getUserProfile)

//user profile update=================================
router.put('/updateInfo',us.updateUserProfile)

//=============================================================================================
//password change
router.get('/changePassword',authGuard.userLoginAuthGuard,userAccess,us.passChange)

//password Check
router.post('/checkPasswords',us.passwordChange2)


//Manage  Address
router.get('/manageAddress',authGuard.userLoginAuthGuard,userAccess,us.renderManageAddress)


//user Address add
router.post('/saveAddress',us.addAddress)

// customer update address===============
router.post('/updateAddress/:userId',us.updateAddress)

//delete address
router.get('/deleteAddress/:userId/:addresId',us.deleteAddress)

//=====================================================================================================================================================
//================================================
//user checkout
router.get('/buyTheProducts',authGuard.userLoginAuthGuard,userAccess,us.checkoutUser)


//order confirmation page======================================================
router.post('/placeOrder',async(req,res)=>{
  console.log("Entered to place order");
  const email = req.session.email;
  
  const Address = req.body.selectedAddress;
  // console.log("Selected Address====",Address)
  const paymentMethod = req.body.selectedPayment;

  const amount = req.session.totalAmount;

  try {
      const userData = await userModel.findOne({ email: email });
      
      if (!userData) {
          return;
      }

      const userID = userData._id;

      const cartData = await cartModel.findOne({ userId: userID });
      console.log("cartData====================----------------=================",cartData.Items);

      if (!cartData) {
          console.log("Cart data not available");
          return;
      }

      const addressNew = await userModel.findOne({
          _id:userID,
          address:{$elemMatch:{_id: new mongoose.Types.ObjectId(Address)}}
      })
  
      if (addressNew) {
        var addressObjIndex = addressNew.address.findIndex(addr=>addr._id == Address)
      } 

    

      const add = {
          Name: addressNew.address[addressObjIndex].Name,
          Address: addressNew.address[addressObjIndex].AddressLine,
          Pincode: addressNew.address[addressObjIndex].Pincode,
          City: addressNew.address[addressObjIndex].City,
          State: addressNew.address[addressObjIndex].State,
          Mobile:  addressNew.address[addressObjIndex].Mobile
      }

      // console.log(add);
     

      const newOrder = new orderModel({
          UserId: userID,
          Items: cartData.Items.map(cartItem => ({
            productId: cartItem.ProductId, // Assuming this is the correct property name
            quantity: cartItem.Quantity,
          })),
          PaymentMethod: paymentMethod,
          OrderDate: moment(new Date()).format("llll"),
          ExpectedDeliveryDate: moment().add(4, "days").format("llll"),
          TotalPrice: amount,
          Address: add
      });
      if(paymentMethod=='cod'){
        console.log("inside payment method = cod and order model is creating")
      const order = await newOrder.save();
      req.session.orderID = order._id;
      // console.log("Order detail", order);
      await cartModel.findByIdAndDelete(cartData._id);

      for (const item of order.Items) {
          const productId = item.productId;
          const quantity = item.quantity;
          const product = await products.findById(productId);

          if (product) {
              const updateQuantity = product.Stock - quantity;
              product.Selled += quantity
              if (updateQuantity < 0) {
                  product.Stock = 0;
                  product.Status = "Out of stock";
              } else {
                  product.Stock = updateQuantity;
                  await product.save();
              }
          }
      }
//just redirect if code to some route
          req.session.visited = 0
          console.log("order response back");
          res.json({ success: true, method:'cod' });
      }else if(paymentMethod == 'online'){
        const orderId =await razor.createOrder(req.session.totalAmount)
        console.log("order Id=====",orderId)
        console.log("id of order===",orderId.id);
        req.session.orderID = orderId.id;
        res.json({
          success:true,
          method:'online',
          orderId: orderId,
          totalAmount:req.session.totalAmount
      })
      }//else if(paymentMetod == 'wallet'){
      //   res.json({success:true, method: 'wallet'})
      // }
  } catch (error) {
      console.error("An error occurred:", error);
      console.log("cart data note available 01--");
  }
})


router.post('/verify-payment',async(req,res)=>{
  console.log("data from body==== in verify payment====",req.body,"orderId from sesssion=========",req.session.orderID)
  razor.verifyPayment(req.body,req.session.orderID).then(()=>{
    console.log("payment success")
  }).catch((err)=>{
    res.json({status:'payment failed'})
  })
})  




router.get('/placeOrder',authGuard.userLoginAuthGuard,userAccess,(req,res)=>{
  let name = req.session.name
  let orderId = req.session.orderID
  req.session.visited++

  if(req.session.visited < 2){
  res.render('user/userOrderConfirm',{name, title:"Oreder Confirmed",orderId})
}else{res.redirect('/userHome')}
})




router.get('/orderDetails',authGuard.userLoginAuthGuard,userAccess,async(req,res)=>{
  try {
    const name = req.session.name;
    const userId = req.session.userId
    const orderDetails = await  orderModel.find({UserId:req.session.userId}).sort({_id: -1})
    const cartData = await cartModel.findOne({userId:userId})
    let cartcount = 0
    if (cartData === null || cartData.Items == (null||0)) {
      
      cartcount = 0

    }else{
    cartData.Items.forEach((cart)=>{
      
      cartcount += cart.Quantity
    })
  }
    res.render('user/orderTracker',{title:"Zoan | Track your orders",name,orderDetails,cartcount})
  } catch (error) {
    console.error(error)
  }
})


//cancel order
router.get('/cancelOrderData/:orderId',async(req,res)=>{
  // console.log("inside cancel order route")

 try {
  const order = await orderModel.findByIdAndUpdate({_id:req.params.orderId},{Status:"Canceled"})
  order.Items.forEach(async(product)=>{
    const P_id = product.productId
    const count = product.quantity
    await products.findByIdAndUpdate({_id:P_id},{$inc:{Stock:count}})
  })
  console.log("ordermodel====",order)
  res.json({
    success:true
  })
 } catch (error) {
  console.log(error)
 }
})



//order products view
router.get('/orderProductView/:orderId',authGuard.userLoginAuthGuard,userAccess,async(req,res)=>{
  const orderId = req.params.orderId
  const userId = req.session.userId
  const orders = await orderModel.findById({_id:orderId}).populate('Items.productId')
  const cartData = await cartModel.findOne({userId:userId})
    let cartcount = 0
    if (cartData === null || cartData.Items == (null||0)) {
      
      cartcount = 0

    }else{
    cartData.Items.forEach((cart)=>{
      cartcount += cart.Quantity
    })
  }
  const name = req.session.name;
  res.render('user/order-ProductDetails',{title:"Ordered Items",name,orders,cartcount})
})



//order return 
router.post('/returnedItem',async(req,res)=>{
  const productId = new mongoose.Types.ObjectId(req.body.P_id);
  const P_qty = req.body.P_qty;
  const O_id = new mongoose.Types.ObjectId(req.body.O_id);
  console.log("reached post route", productId)
  console.log(`data====P_id==${productId},P-qty=${P_qty},O_id = ${O_id}`);
  const updatedOrder = await orderModel.findOneAndUpdate(
    { _id: O_id, 'Items.productId': productId },
    { $set: { 'Items.$.removed': true } },
    { new: true }
  );
  const updateProduct = await products.findByIdAndUpdate({_id: productId},{$inc:{Stock:P_qty}})
  res.json({success:true})
})


//coupons
//get
router.get('/manageCoupons',async(req,res)=>{
  const cartcount = cartHelper 
  const coupons = await coupon.find()
  console.log("Cpns===",coupons)
  const name = req.session.name
  res.render('user/userCoupons',{title:"Coupons",cartcount,name,coupons})
})

//apply coupons
router.post('/applyCoupon',async(req,res)=>{
  let code =req.body.code
  let totalAmount = req.session.totalAmount
  console.log("total Amount===",totalAmount)
  let coupons = await coupon.findOne({code:code})
  // if(coupon == 
  // console.log("check inside apply coupon====",coupons)
  if(coupons == null){
    res.json({
      success:false,
      message:'Invalid Coupon'
    })
  }else{
    if(totalAmount>=coupons.forPuchace){
      res.json({success:true, message:"Coupon applied"})
    }else{
      res.json({success:false, message:'Cannot apply this coupon'})
    }
  }
})









module.exports = router 