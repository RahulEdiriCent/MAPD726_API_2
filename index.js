const express = require('express');
const multer = require('multer');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const bcrypt = require('bcrypt');
const { Storage } = require('@google-cloud/storage');

let SERVER_NAME = 'snapify-api' //server name
let PORT = process.env.PORT || 3500; //chosen server port
let HOST = '0.0.0.0'; //chosen server address (for this project)


const server = express();
const storage = new Storage({
    projectId: 'class711-1',
    keyFilename: './GSCKey/class711-1-818ea7830005.json'
  });
const bucketName = 'mapd726_images';
const imageUpload = multer({dest: 'products/'});

const CONNECTER_STRING = "mongodb+srv://cente713User_1:4MmB74RofHDl9iY3@map713-712projectdb.jgu68kw.mongodb.net/snapify";
mongoose.connect(CONNECTER_STRING, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});
const db = mongoose.connection;


db.on('error', console.error.bind(console, '!CONNECTION ERROR! ::'))
db.once('open', () => {
    console.log('Connection to MongoDB established!');
});

const userSchema = new mongoose.Schema({
    firstName: String,
    lastName: String,
    // email: String,
    email: { 
        type: String,
        unique: true
    },
    gender: String,
    phoneNumber:String,
    address: String,
    userType: String,
    salt: String,
    hash: String,
});

const productSchema = new mongoose.Schema({
    productName: { 
        type: String,
        unique: true
    },
    brandName: String,
    shoeType: String,
    price: Number,
    details: String,
    imagesArray: [String],
    sizeArray: [Number],//[Number],
    shoeColor: String,
    shoeSizeText: String,
});

const cartItemSchema = new mongoose.Schema({
    productId: String,
    userId: String,
    quantity: Number,
    totalPrice: Number
});

let UserModel = mongoose.model('Users', userSchema);
let ProductModel = mongoose.model('Products', productSchema);
let CartItemModel = mongoose.model('CartItems', cartItemSchema);

server.use(express.json());

//=======================================USERS================================================//

server.post('/login', (req,res,next) => {//LOGIN AS USER
    returnMessage = {
        success: false,
        message: ""
    }
    console.log("Logging In....")
    if (!req.body.email || !req.body.password || req.body.email === undefined || req.body.password === undefined) {
        
        console.log("Email: " + req.body.email + ", Password: " + req.body.password)
        returnMessage.message = "Please provide all required fields"
        res.status(200).json(returnMessage);
        
        return next();

    }else{
        console.log("Email: " + req.body.email + ", Password: " + req.body.password)
        UserModel.findOne({email: req.body.email}).then((loggingInUser)=>{
            if(loggingInUser){
                console.log("Found User " + loggingInUser.firstName + " -> Verify Password");
                //res.send(loggingInUser);
                //return next();
                bcrypt.compare(req.body.password, loggingInUser.hash).then(Result=>{
                    if(!Result){

                        returnMessage.message = "Password is Incorrect"
                        res.status(200).json(returnMessage);

                        return next();
                    }else{
                        console.log("Login Successful -> Logged In as:" + loggingInUser.firstName);
                        //res.send(loggingInUser);

                        let _user = {
                            _id: loggingInUser._id,
                            firstName: loggingInUser.firstName,
                            lastName: loggingInUser.lastName,
                            email: loggingInUser.email,
                            userType: loggingInUser.userType,
                            gender:loggingInUser.gender,
                            phoneNumber: loggingInUser.phoneNumber,
                            address: loggingInUser.address,
                        };

                        returnMessage = {
                            success: true,
                            user: _user
                        }

                        res.status(200).json(returnMessage)
                        //token Logic? 
                        return next();
                    }
                }).catch(compareError=>{
                    console.log('An Error occured while Logging in: ' + compareError);
                    return res.status(500).json({ error: "LOGIN ERROR!"});
                    //return next(new Error(JSON.stringify("LOGIN ERROR!")));
                });
            }else{
                console.log("Unable to find User with That Information");
                res.status(404).json("User Not Found");
            }
        }).catch((loginError)=> {  
            console.log('An Error occured while Logging in: ' + loginError);
            return res.status(500).json({ error: "ERROR! : " + loginError.errors});
            //return next(new Error(JSON.stringify("ERROR! " + loginError.errors)));
        })
    }
})

server.post('/register', (req,res,next) => {//REGISTER USER
    console.log("Registering New User...")
    returnMessage = {
        success: false,
        message: ""
    }

    if (!req.body.firstName || 
        !req.body.lastName || 
        !req.body.email || 
        !req.body.userType || 
        !req.body.password || 
        req.body.gender === undefined || 
        !req.body.address || 
        !req.body.userType) {

            returnMessage.message = "Please provide all required fields"
            res.status(200).json(returnMessage);
            return next();

    }else{

        var salt = ""; 
        var hash = ""; //bcrypt.hash(password, salt);
        bcrypt.genSalt(10).then(_salt =>{
            salt = _salt;
            bcrypt.hash(req.body.password, salt).then(_hash =>{
                hash = _hash;
                console.log("S: " + salt + ", H: " + hash);

                let toRegisterUser = new UserModel({
                    //userId: req.body.userId, //change later to be auto-number
                    firstName: req.body.firstName,
                    lastName: req.body.lastName,
                    email: req.body.email,
                    gender:req.body.gender,
                    phoneNumber: req.body.phoneNumber,
                    address: req.body.address,
                    userType: req.body.userType,
                    salt: salt,
                    hash: hash,
                });
        
                UserModel.findOne({email: req.body.email}).then((foundUser)=>{
                    if(foundUser){

                        returnMessage.message = "Email Already in Use"
                        console.log("Email Already in Use: " + foundUser.firstName);
                        res.status(200).json(returnMessage);

                        return next();

                    }else{
                        toRegisterUser.save().then((registeredUser)=>{
                            console.log("Successfully Registered User:" + registeredUser);

                            returnMessage.success = true
                            returnMessage.message = "User Successfully Registered"

                            res.status(200).json(returnMessage);
                            return next();

                        }).catch((registrationError)=>{
                            console.log('An Error occured while registering User: ' + registrationError);
                            return res.status(500).json({ error: "ERROR! : " + searchUserError});
                            //return next(new Error(JSON.stringify("ERROR! " + registrationError.errors)));
                        });
                    }
                }).catch((findingUserError)=>{
                    console.log('An Error occured while trying to register User: ' + findingUserError);
                    return res.status(500).json({ error: "ERROR! : " + findingUserError.errors});
                    //return next(new Error(JSON.stringify("ERROR! " + findingUserError.errors)));
                });

            }).catch((saltError)=>{
                console.log('An Error occured while trying to register User: ' + saltError);
                return res.status(500).json({ error: "ERROR! : " + saltError});
                //return next(new Error(JSON.stringify("ERROR! " + saltError)));
            });
        }).catch(hashError=>{
            console.log('An Error occured while trying to register User: ' + hashError);
            return res.status(500).json({ error: "ERROR! : " + hashError});
        //return next(new Error(JSON.stringify("ERROR! " + hashError)));
        });
        
    }     
})

server.get('/user/:id', (req,res,next) => {//GET USER BY ID
    
    console.log("Finding User by ID...")
    returnMessage = {
        success: false,
        message: ""
    }

    UserModel.findOne({_id: req.params.id}).then((foundUser)=>{
        if(foundUser){
            console.log("User Found -> Returning User:" + foundUser.firstName);

            let _user = {
                _id: foundUser._id,
                firstName: foundUser.firstName,
                lastName: foundUser.lastName,
                email: foundUser.email,
                userType: foundUser.userType,
                gender:foundUser.gender,
                phoneNumber: foundUser.phoneNumber,
                address: foundUser.address,
            };

            returnMessage = {
                success: true,
                user: _user
            }
            res.status(200).json(returnMessage)
            return next();
        }else{
            returnMessage.message = "User not Found"
            res.status(200).json(returnMessage);
            return next();
        }
    }).catch((searchUserError)=>{
        console.log('An Error occured while trying to find User with ID: ' + searchUserError);
        return res.status(500).json({ error: "ERROR! : " + searchUserError});
        //return next(new Error(JSON.stringify("ERROR! " + searchUserError)));
    })
})

server.put('/user/:id', (req,res,next) => {//UPDATE USER BY ID
    
    console.log("Updating User....")
    returnMessage = {
            success: false,
            message: ""
    }

    
    if (!req.body.firstName || 
        !req.body.lastName || 
        !req.body.email || 
        !req.body.userType || 
        //!req.body.password || 
        req.body.gender === undefined || 
        !req.body.address || 
        !req.body.userType) {

            //console.log("Email: " + req.body.email + ", Password: " + req.body.password)
            returnMessage.message = "Please provide all required fields"
            res.status(200).json(200, returnMessage);
            return next();

    }else{

        // var salt = ""; 
        // var hash = ""; //bcrypt.hash(password, salt);
        // bcrypt.genSalt(10).then(_salt =>{
        //     salt = _salt;
        //     bcrypt.hash(req.body.password, salt).then(_hash =>{
        //         hash = _hash;
        //         console.log("S: " + salt + ", H: " + hash);

                let toEditUser = {
                    //userId: req.body.userId, //change later to be auto-number
                    firstName: req.body.firstName,
                    lastName: req.body.lastName,
                    email: req.body.email,
                    gender:req.body.gender,
                    phoneNumber: req.body.phoneNumber,
                    address: req.body.address,
                    userType: req.body.userType,
                    // salt: salt,
                    // hash: hash,
                };

                UserModel.findOneAndUpdate({_id: req.params.id}, toEditUser, {new:true}).then((toUpdateUser)=>{
                    if(toUpdateUser){

                        returnMessage.message = "User Found and Updated"
                        returnMessage.success = true
                        res.status(200).json(returnMessage);

                        return next();

                    }else{

                        returnMessage.message = "Update Failed: User not Found"
                        res.status(200).json(returnMessage);

                        return next();
                    }

                }).catch((updateError)=>{
                    console.log("An Error occurred while trying to update User" + updateError);
                    return res.status(500).json({ error: "ERROR! : " + updateError.errors});
                    //return next(new Error(JSON.stringify("ERROR! " + updateError.errors)))
                });

        //     }).catch((saltError)=>{
        //         console.log('An Error occured while trying to update User: ' + saltError);
        //         return next(new Error(JSON.stringify("ERROR! " + saltError)));
        //     });

        // }).catch(hashError=>{
        //     console.log('An Error occured while trying to update User: ' + hashError);
        //     return next(new Error(JSON.stringify("ERROR! " + hashError)));
        // });
    }
})

server.get('/user/name/:name', (req,res,next) => {//GET USER BY NAME
    
    console.log("Finding User by ID...")
    returnMessage = {
        success: false,
        message: ""
    }

    UserModel.findOne({firstName: req.params.name}).then((foundUser)=>{
        if(foundUser){
            console.log("User Found -> Returning User:" + foundUser.firstName);

            let _user = {
                _id: foundUser._id,
                firstName: foundUser.firstName,
                lastName: foundUser.lastName,
                email: foundUser.email,
                userType: foundUser.userType,
                gender:foundUser.gender,
                phoneNumber: foundUser.phoneNumber,
                address: foundUser.address,
            };

            returnMessage = {
                success: true,
                user: _user
            }
            res.status(200).json(foundUser)

            return next();

        }else{

            returnMessage.message = "User not Found"
            res.status(200).json(returnMessage);

            return next();
        }
    }).catch((searchUserError)=>{
        console.log('An Error occured while trying to find User with ID: ' + searchUserError);
        return res.status(500).json({ error: "ERROR! : " + searchUserError});
        //return next(new Error(JSON.stringify("ERROR! " + searchUserError)));
    })
})

//===========================PRODUCTS==================================

server.get('/products/brand/:brand', (req,res,next) => {//FIND PRODUCTS BY CATEGORY
    
    console.log("Finding Product by Brand/Category...")
    returnMessage = {
        success: false,
        message: ""
    }
 
    if (!req.params.brand || req.params.brand == "") {            
            returnMessage.message = "Please provide category"
            res.status(200).json(returnMessage);
            return next();

    }else{
        ProductModel.find({brandName: req.params.brand}).then((filteredProducts)=>{
            if(filteredProducts){
                console.log("Products Found -> Returning Products");
                returnMessage = {
                    success: true,
                    products: filteredProducts
                }
                res.status(200).json(returnMessage)
                return next();
            }else{
                returnMessage.message = "No Products Found For Brand/Category"
                res.status(200).json(returnMessage);
                return next();
            }
        }).catch((searchProductsError)=>{
            console.log('An Error occured while trying to find Product with ID: ' + searchProductsError);
            return res.status(500).json({ error: "ERROR! : " + searchProductsError});
            //return next(new Error(JSON.stringify("ERROR! " + searchProductsError)));
        })
    }
})

server.get('/products/:id', (req,res,next) => {//GET PRODUCT BY ID
    
    console.log("Finding Product by ID...")
    returnMessage = {
        success: false,
        message: ""
    }

    ProductModel.findOne({_id: req.params.id}).then((foundProduct)=>{
        if(foundProduct){
            console.log("Product Found -> Returning Product:" + foundProduct.productName);
            
            let doubleSizeArray = foundProduct.sizeArray.map(size => size.toFixed(1)) // set it to Double formatting
            let _product = {
                _id: foundProduct._id,
                productName: foundProduct.productName,
                brandName: foundProduct.brandName,
                shoeType: foundProduct.shoeType,
                price: foundProduct.price,
                details: foundProduct.details,
                imagesArray: foundProduct.imagesArray,
                sizeArray: doubleSizeArray,//foundProduct.sizeArray,
                shoeColor: foundProduct.shoeColor,
                shoeSizeText: foundProduct.shoeSizeText,
            };

            returnMessage = {
                success: true,
                product: _product
            }
            res.status(200).json(returnMessage)
            return next();
        }else{
            returnMessage.message = "Product not Found"
            res.status(200).json(returnMessage);
            return next();
        }
    }).catch((searchProductError)=>{
        console.log('An Error occured while trying to find Product with ID: ' + searchProductError);
        return res.status(500).json({ error: "ERROR! : " + searchProductError.errors});
        //return next(new Error(JSON.stringify("ERROR! " + searchProductError)));
    })
})

server.post('/products', imageUpload.array('imageList'), async (req,res,next) => {//ADD PRODUCT
    
    console.log("Adding Product....")
    returnMessage = {
            success: false,
            message: ""
    }

    try{
        if (!req.body.productName || 
            !req.body.brandName || 
            !req.body.price || 
            !req.body.shoeType || 
            !req.body.details || 
            req.body.sizeArray === undefined || 
            !req.body.shoeColor ||
            !req.body.shoeSizeText) { 

                returnMessage.message = "Please provide all required fields "
                res.status(200).json(returnMessage);

                return next();

        }else{
            const imageUrls = [];

            for (const file of req.files){
                const imageUUID = uuidv4();
                const imageName = `${imageUUID}-${file.originalname}`;
                const filePath = `images/${imageName}`;

                // Upload image to Google Cloud Storage
                await storage.bucket(bucketName).upload(file.path, {
                    destination: filePath,
                    metadata: {
                        contentType: file.mimetype,
                        metadata: {
                            firebaseStorageDownloadTokens: imageUUID
                        }
                    }
                });

                // Get signed URL for the uploaded image
                const imageUrl = `https://storage.googleapis.com/${bucketName}/${filePath}`;
                imageUrls.push(imageUrl);

                // Delete the temporary uploaded file
                fs.unlinkSync(file.path);
            };

            console.log('Images Uploaded Successfully');
            // 
            const toPrep = (req.body.sizeArray).slice(1,(req.body.sizeArray).length - 1)
            let doubleSizeArray = toPrep.split(',')
            doubleSizeArray = doubleSizeArray.map(Number)
            doubleSizeArray = doubleSizeArray.map(size => size.toFixed(1))

            let toAddProduct = new ProductModel({
                    productName: req.body.productName, 
                    brandName: req.body.brandName, 
                    shoeType: req.body.shoeType,
                    price: req.body.price, 
                    details: req.body.details,
                    imagesArray: imageUrls, 
                    sizeArray: doubleSizeArray,
                    shoeColor: req.body.shoeColor,
                    shoeSizeText: req.body.shoeSizeText,
            });
        
            const foundProduct = await ProductModel.findOne({productName: req.body.productName})
            if(foundProduct){
        
                    returnMessage.message = "Product Name Already in Use"
                    console.log("Product Name Already in Use: " + foundProduct.productName);
                    res.status(200).json(returnMessage);
        
                    return next();
        
            }else{
        
                    const addedProduct = await toAddProduct.save()
                    if(addedProduct){
                        console.log("Successfully Added Product:" + addedProduct);
        
                        returnMessage.success = true
                        returnMessage.message = "Product Successfully Added"
        
                        res.status(200).json(returnMessage);
                        return next();
                        
                    }else{
                        throw findingProductError;
                    }
            }
                
        }
    }catch(findingProductError){
        console.log('An error occurred while processing the request:', findingProductError);
        return res.status(500).json({ error: "ERROR! : " + findingProductError.errors});
        //return res.status(500).json({ error: "An internal server error occurred : " + findingProductError});
    }
});


server.put('/products/:id', (req,res,next) => {//UPDATE PRODUCT
    
    console.log("Updating Product....")
    returnMessage = {
            success: false,
            message: ""
    }

    
    if (!req.body.productName || 
        !req.body.brandName || 
        !req.body.price || 
        !req.body.shoeType || 
        !req.body.details || 
        req.body.imagesArray === undefined || 
        req.body.sizeArray === undefined || 
        !req.body.shoeColor ||
        !req.body.shoeSizeText) {   

            returnMessage.message = "Please provide all required fields "
            res.status(200).json(returnMessage);
            return next();

    }else{
        let doubleSizeArray = req.body.sizeArray.map(size => size.toFixed(1))
        let toEditProduct = {
            productName: req.body.productName, 
            brandName: req.body.brandName, 
            shoeType: req.body.shoeType,
            price: req.body.price, 
            details: req.body.details,
            imagesArray: req.body.imagesArray, 
            sizeArray: doubleSizeArray, 
            shoeColor: req.body.shoeColor,
            shoeSizeText: req.body.shoeSizeText,
        };

                ProductModel.findOneAndUpdate({_id: req.params.id}, toEditProduct, {new:true}).then((toUpdateProduct)=>{
                    if(toUpdateProduct){

                        returnMessage.message = "Product Found and Updated"
                        returnMessage.success = true
                        res.status(200).json(returnMessage);

                        return next();

                    }else{

                        returnMessage.message = "Update Failed: Product not Found"
                        res.status(200).json(returnMessage);
                        return next();

                    }

                }).catch((updateProductError)=>{
                    console.log("An Error occurred while trying to update Product" + updateProductError);
                    return res.status(500).json({ error: "ERROR! : " + updateProductError.errors});
                    //return next(new Error(JSON.stringify("ERROR! " + updateProductError.errors)))
                });
    }
})


//===========================CARTITEMS==================================
server.get('/cart/:uid', (req,res,next) => {//GET PRODUCT BY ID
    
    console.log("Finding Cart Items by User ID...")
    returnMessage = {
        success: false,
        message: ""
    }

    CartItemModel.find({userId: req.params.uid}).then((foundCartItems)=>{
        if(foundCartItems){
            console.log("Found -> " + foundCartItems.size + " Cart Items");
            
            // let _product = {
            //     _id: foundCartItems._id,
            //     productName: foundCartItems.productName,
            //     brandName: foundCartItems.brandName,
            //     shoeType: foundCartItems.shoeType,
            //     price: foundCartItems.price,
            //     details: foundCartItems.details,
            //     imagesArray: foundCartItems.imagesArray,
            //     sizeArray: doubleSizeArray,//foundProduct.sizeArray,
            //     shoeColor: foundCartItems.shoeColor,
            //     shoeSizeText: foundCartItems.shoeSizeText,
            // };

            returnMessage = {
                success: true,
                cartItems: foundCartItems
            }
            res.status(200).json(returnMessage)

            return next();

        }else{

            returnMessage.message = "No Cart Items Found"
            res.status(200).json(returnMessage);

            return next();

        }
    }).catch((searchCartItemsError)=>{
        console.log('An Error occured while trying to find Cart Items with that User ID! : ' + searchCartItemsError);
        return res.status(500).json({ error: "ERROR! : " + searchProductsError.errors});
        //return next(new Error(JSON.stringify("ERROR! " + searchCartItemsError)));
    })
})

server.get('/cartitem/:cid', (req,res,next) => {//GET PRODUCT BY ID
    
    console.log("Finding Cart Item by ID...")
    returnMessage = {
        success: false,
        message: ""
    }

    ProductModel.findOne({_id: req.params.cid}).then((foundCartItem)=>{
        if(foundCartItem){
            console.log("Cart Item Found -> Returning Product:" + foundCartItem._id);

            let _cartItem = {
                _id: foundCartItem._id,
                userId: foundCartItem.userId,
                productId: foundCartItem.productId,
                quantity: foundCartItem.quantity,
                totalPrice: foundCartItem.totalPrice
            };

            returnMessage = {
                success: true,
                product: _cartItem
            }
            res.status(200).json(returnMessage)

            return next();

        }else{

            returnMessage.message = "Cart Item not Found"
            res.status(200).json(returnMessage);

            return next();

        }
    }).catch((searchProductError)=>{
        console.log('An Error occured while trying to find Cart Item with that ID! : ' + searchProductError);
        return res.status(500).json({ error: "ERROR! : " + searchProductError.errors});
        //return next(new Error(JSON.stringify("ERROR! " + searchProductError)));
    })
})

server.post('/cartitem', (req,res,next) => {//ADD PRODUCT
    
    console.log("Adding Cart Item....")
    returnMessage = {
            success: false,
            message: ""
    }

    
    if (!req.body.productId || 
        !req.body.userId || 
        !req.body.totalPrice || 
        !req.body.quantity) {            

            returnMessage.message = "Please provide all required fields "
            res.status(200).json(returnMessage);

            return next();

    }else{
        let toAddCartItem = new CartItemModel({
            userId: req.body.userId,
            productId: req.body.productId,
            quantity: req.body.quantity,
            totalPrice: req.body.totalPrice
        });

        toAddCartItem.save().then((addedProduct)=>{
        console.log("Successfully Added Cart Item:" + addedProduct._id);
    
        returnMessage.success = true
        returnMessage.message = "Cart Item Successfully Added"
    
        res.status(200).json(returnMessage);
        return next();
    
        }).catch((addCartItemError)=>{
            console.log('An Error occured while trying to add Cart Item: ' + addCartItemError);
            return res.status(500).json({ error: "ERROR! : " + addCartItemError.errors});
            //return next(new Error(JSON.stringify("ERROR! " + addCartItemError.errors)));
        });

    }
})

server.put('/cartitem/:cid', (req,res,next) => {//UPDATE PRODUCT
    
    console.log("Updating CartItem....")
    returnMessage = {
            success: false,
            message: ""
    }

    if (!req.body.productId || 
        !req.body.userId || 
        !req.body.totalPrice || 
        !req.body.quantity) {            
            returnMessage.message = "Please provide all required fields "
            res.status(200).json(returnMessage);
            return next();

    }else{
        let toEditCartItem = {
            userId: req.body.userId,
            productId: req.body.productId,
            quantity: req.body.quantity,
            totalPrice: req.body.totalPrice
        };

        CartItemModel.findOneAndUpdate({_id: req.params.cid}, toEditCartItem, {new:true}).then((toUpdateCartItem)=>{
            if(toUpdateCartItem){

                        returnMessage.message = "Cart Item Found and Updated"
                        returnMessage.success = true
                        res.status(200).json(returnMessage);

                        return next();

            }else{

                        returnMessage.message = "Update Failed: Cart Item not Found"
                        res.status(200).json(returnMessage);

                        return next();
            }

        }).catch((updateCartItemError)=>{
            console.log("An Error occurred while trying to update Cart Item" + updateCartItemError);
            return res.status(500).json({ error: "ERROR! : " + updateCartItemError.errors});
            //return next(new Error(JSON.stringify("ERROR! " + updateCartItemError.errors)))
        });
    }
})

server.delete('/cartitem/:cid', (req,res,next) => {//UPDATE PRODUCT
    
    console.log("Deleting Cart Item by Id....")
    returnMessage = {
            success: false,
            message: ""
    }

    CartItemModel.findOneAndDelete({_id: req.params.cid}).then((deletedCartItem)=>{
        if(deletedCartItem){

            returnMessage.message = "Cart Item Found and Deleted"
            returnMessage.success = true
            res.status(200).json(returnMessage);
                        
            return next();

        }else{
                        
            returnMessage.message = "Delete Failed: Cart Item not Found"
            res.status(200).json(returnMessage);
                        
            return next();

        }

    }).catch((deleteCartItemError)=>{
        console.log("An Error occurred while trying to delete Cart Item" + deleteCartItemError);
        return res.status(500).json({ error: "ERROR! : " + deleteCartItemError.errors});
        //return next(new Error(JSON.stringify("ERROR! " + deleteCartItemError.errors)))
    });

})

//START SERVER
server.listen(PORT, HOST, () => {
    console.log(`Server ${SERVER_NAME} listening at http://${HOST}:${PORT}`);
});