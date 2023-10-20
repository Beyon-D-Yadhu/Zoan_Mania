const userModel = require('../models/user')
const productInHome = require('../controllers/home-page-products')

const controller = require('../controllers/for-otp')
const otpModel = require('../models/otpModel')


const bcrypt = require('bcrypt')
const saltRounds = 10

  

//userlogin
const userLogin = (req,res)=>{
    const txt = req.session.txt
    res.render('user/userLogin',{title:"login",txt})
    // res.send("done")
}

 
const userSignup = (req,res)=>{
    const exist = req.session.exist
    res.render('user/userSignUp',{title:"SignuUp",exist})  
}


const getHome = (req,res)=>{
    req.session.loggedIn = true;
    const name = req.session.name
    console.log(name)
    
    res.render('user/userHome',{title:"Zoan Home",productInHome,name})
    
}


const otpForm = (req,res)=>{
    // otp timer-----------------
    const timer =  setTimeout(() => {
        controller.vaotp = null
        req.session.Pw = null
        console.log("time up")
    }, 60000);

    // clearTimeout(timer)
    //------------------
    // console.log(controller.vaotp)
    res.render('user/otpRegister',{title:"Register"})
}
//////////////////////////////////////////////////////////////////////////////////////////////////////////////
//entering home--------------------
const postEnteringHOme = async(req,res)=>{
    let userOtp=req.body.number1
    console.log(controller.vaotp)
    console.log(controller.otp)
    console.log(req.session.data)
    const {name,email,password}=req.session.data;
    
    req.session.name = name


    const logins = await userModel.findOne({email:email})
    // if(newOtp!==undefined){
    //     setTimeout(async()=>{
    //         await otpModel.delete({})
    //         newOtp = undefined
    //     },60000)
    // }
    if(!logins){
    if(userOtp==controller.vaotp||userOtp == req.session.Pw){
        const hashPass = await bcrypt.hash(req.session.password,saltRounds)
        req.session.userAuth = true;

        // await otpModel.delete()

        const logged=await userModel.create({name,email,password:hashPass});
        console.log(logged)

        req.session.userId = await userModel.findOne({email:email},{_id:1})
        res.redirect('/userHome')
    }else{
        res.send('something went wrong')
        // res.render('/signup',{text:"enter valid otp"})
    }
}else{
    // res.render('/signup',{text:"email already exist"})
    res.send('email already exists')
}
}
//////////////////////////////////////////////////////////////////////////////////////////////////////////

const userLoginBackend = async(req,res)=>{
    const {email,password} = req.body;
    // console.log(email);
    
    const logins = await userModel.findOne({email: email})
    // console.log(logins)
    console.log(logins)
    if(!logins){
        const txt ="No users found"
        res.redirect('/login')
        // res.render('user/userLogin',{txt:"No users found",title: "Login"})
    }else{
        let isChecked = await bcrypt.compare(password,logins.password)
        
        req.session.name = logins.name
        // const check = await userModel.findOne({email:email},{access:1})
        console.log(logins.access)
        if(isChecked == true && logins.access){
            req.session.userAuth = true;
            req.session.userId = await userModel.findOne({email:email},{_id: 1})
            console.log('userId='+req.session.userId)
            res.redirect('/userHome')
        }else{
            req.session.txt = "User is blocked"
            res.redirect('/login')
            // res.render('user/userLogin',{txt:"User not found",title:"login"})
        }
    }
}



module.exports = {
    userLogin,
    userSignup,
    getHome,
    otpForm,
    postEnteringHOme,
    userLoginBackend
}