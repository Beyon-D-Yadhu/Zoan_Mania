const crypto = require('crypto')

require('dotenv').config()
const Razorpay = require('razorpay');
var instance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });

  const createOrder = (totalPrice) => {
    return new Promise((resolve, reject) => {
        var options = {
            amount: totalPrice*100,  // amount in the smallest currency unit
            currency: "INR",
            receipt: "order_rcptid_11"
          };
          instance.orders.create(options, function(err, order) {
            console.log("order Created498274387dhslcnls983y9hjvcnldj===",order);
            resolve(order)
          });
    })
  }
  const verifyPayment = (details,orderId) => {
    return new Promise((resolve, reject) => {
        console.log("+++===++=-------------------------------------!!!!!!!!!!!!!!!!!!!!!!");
        console.log("details-==",details)
        console.log("orderId===",orderId)
        console.log("env.secret====",process.env.RAZORPAY_KEY_SECRET)
        // let hmac = crypto.createHmac('sha256',process.env.RAZORPAY_KEY_SECRET)
        // let generated_signature = hmac_sha256(orderId.id+ "|" + details.payment.razorpay_payment_id, process.env.RAZORPAY_KEY_SECRET);
        // // hmac.update(orderId+'|'+,process.env.RAZORPAY_KEY_SECRET);
        // console.log("after generated signature")
        // if(generated_signature == details['payment[razorpay_signature]']){
        //     console.log("success payment");
        //     resolve()
        // }else{
        //     reject()
        // }
        let hmac = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET);
        console.log(
          details.payment.razorpay_order_id +
            "|" +
            details.payment.razorpay_payment_id
        );
        hmac.update(
          details.payment.razorpay_order_id +
            "|" +
            details.payment.razorpay_payment_id
        );
    
        hmac = hmac.digest("hex");
        console.log(
          hmac,
          "hmacccccccccccccccccccccc------------------------------------------"
        );
        if (hmac === details.payment.razorpay_signature) {
          // const orderId = req.body.order.receipt;
          // console.log(orderId, "orderIdddddddddddddddddddddddddd");
          // console.log("reciept", req.body.order.receipt);
          // console.log(
          //   req.body.orderId,
          //   "-------------------------------------------------------------------------------------------------------------------orderid"
          // );
          // const orderID = req.body.orderId;
          // const updateOrderDocument = await order.findByIdAndUpdate(orderID, {
          //   PaymentStatus: "Paid",
          //   paymentMethod: "Online",
          // });
          console.log("hmac success");
          // res.json({ success: true });
          resolve()
        } else {
          console.log("hmac failed");
          // res.json({ failure: true });
          reject()
        }

    })
  }

  module.exports = {
    createOrder,
    verifyPayment
}