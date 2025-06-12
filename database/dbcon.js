const mongoose = require("mongoose")

const connectDb = () =>{
    return mongoose.connect(process.env.local_url)
    .then(()=>{
        console.log("connect DB")

    }).catch((err)=>{
        console.log(err)
    })
}

module.exports = connectDb