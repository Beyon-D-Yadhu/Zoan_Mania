const mongoose = require('mongoose')
const userModel = require('../../models/user')
const cartModel = require('../../models/cartModel')
const orderModel = require('../../models/order')
const products = require('../../models/products')
const razor = require('../../middlewares/razorpay')
const moment = require('moment')
const coupon = require('../../models/coupons')


const getPlaceOrder = (req,res)=>{
  try {
    let name = req.session.name
    let orderId = req.session.orderID
    req.session.visited++
    console.log("req.session.visited==",req.session.visited);
    if(req.session.visited < 2){
    res.render('user/userOrderConfirm',{name, title:"Oreder Confirmed",orderId})
  }else{res.redirect('/userHome')}
    
  } catch (error) {
    console.error("error 500 :",error);
  }
  
  }


const postPlaceOrder = async(req,res)=>{
 
  
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
  
        const cartData = await cartModel.findOne({ userId: userID }).populate('Items.ProductId')
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
        let couponAmount
       if(req.session.usedCoupon){
        let code = req.session.couponCode
        let coup = await coupon.findOne({code:code})
        couponAmount = {
            couponId:coup._id,
            amount: coup.discount
        }
       }else{
        couponAmount = {
          couponId: null,
          amount: 0,       
        }
      }
        let newOrder = new orderModel({
            UserId: userID,
            Items: cartData.Items.map(cartItem => ({
              productId: cartItem.ProductId, // Assuming this is the correct property name
              quantity: cartItem.Quantity,
              discounted: cartItem.ProductId.discountedPrice
            })),
            PaymentMethod: paymentMethod,
            OrderDate: moment(new Date()).format("llll"),
            ExpectedDeliveryDate: moment().add(4, "days").format("llll"),
            TotalPrice: req.session.totalAmount,
            couponAmount: couponAmount,
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
          
          let newOrder = new orderModel({
            UserId: userID,
            Items: cartData.Items.map(cartItem => ({
              productId: cartItem.ProductId, // Assuming this is the correct property name
              quantity: cartItem.Quantity,
            })),
            PaymentMethod: paymentMethod,
            OrderDate: moment(new Date()).format("llll"),
            ExpectedDeliveryDate: moment().add(4, "days").format("llll"),
            TotalPrice: req.session.totalAmount,
            Address: add
          });
          req.session.newOrder = newOrder
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
  }



  const verifyPayment = async(req,res)=>{
    try {
    
      console.log("data from body==== in verify payment====",req.body,"orderId from sesssion=========",req.session.orderID)
      razor.verifyPayment(req.body,req.session.orderID).then(async()=>{
        console.log("payment success")
        console.log("req.session.newOrder===",req.session.newOrder)
        let newOrder = new orderModel(req.session.newOrder)
        await newOrder.save()
        const cartData = await cartModel.findOne({userId:req.session.userId})
        await cartModel.findByIdAndDelete(cartData._id);
        await orderModel.updateOne({_id:newOrder._id},{PaymentStatus:'Paid Online'})
        res.json({status:'payment success'})
      }).catch((err)=>{
        res.json({status:'payment failed'})
    
      })
    
    } catch (error) {
      console.error("error 500 :",error);
    }
    
  }



  const orderDetail = async(req,res)=>{
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
  }


  const cancelOrder = async(req,res)=>{
    // console.log("inside cancel order route")
  
   try {
    const order = await orderModel.findByIdAndUpdate({_id:req.params.orderId},{Status:"Canceled"})
    order.Items.forEach(async(product)=>{
      const P_id = product.productId
      const count = product.quantity
      await products.findByIdAndUpdate({_id:P_id},{$inc:{Stock:count}})

    })
    let total = order.TotalPrice
    console.log("total===",total)
    let userId = req.session.userId
    if(order.PaymentMethod == 'online'){
      await userModel.findByIdAndUpdate({_id:userId},{$inc:{Wallet:total}},{new:true})
    }
    console.log("ordermodel====",order)
    res.json({
      success:true
    })
   } catch (error) {
    console.log(error)
   }
  }



  const getOrderProductView = async(req,res)=>{
    try {
      
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
    
    } catch (error) {
      console.error("error 500 :",error);
    }
    
  }





  const returnedItem = async(req,res)=>{
    try {
      console.log("data from body = ",req.body);
    const productId = new mongoose.Types.ObjectId(req.body.P_id);
    const P_qty = req.body.P_qty;
    const O_id = new mongoose.Types.ObjectId(req.body.O_id);
    const reasons = []
    if(req.body.returnReason && req.body.comments){
      reasons.push(req.body.returnReason)
      reasons.push(req.body.comments)
    }else if(req.body.returnReason){
      reasons.push(req.body.returnReason)
    }
    else{
      reasons.push(req.body.comments)
    }

    const updatedOrder = await orderModel.findOneAndUpdate(
      { _id: O_id, 'Items.productId': productId },
      { $set: { 
        'Items.$.needToRemoved': true,
        'Items.$.returnMessage': reasons
     } },
      { new: true }
    );
    const updateProduct = await products.findByIdAndUpdate({_id: productId},{$inc:{Stock:P_qty}})
    res.json({success:true})
    } catch (error) {
      console.log(error)
    }
  }











module.exports = {
    getPlaceOrder,
    postPlaceOrder,
    verifyPayment,
    orderDetail,
    cancelOrder,
    getOrderProductView,
    returnedItem,

}