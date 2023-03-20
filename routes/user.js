const express = require('express')
const auth = require('../middleware/auth')
const Customer = require('../models/Customer')
const router = new express.Router()

// get user info
router.get('/me', auth,async(req, res) => {
    return res.status(200).json(req.user)
})

router.get('/orders', auth, async (req, res) => {
    // get all the order of a user
    const {id} = req.user;
    try {
        // SELECT * FROM orders WHERE userId = id;
    } catch (error) {
        
    }
})

router.get('/cart', auth, async (req, res) => {
    // get all the order of a user
    const {id} = req.user;
    try {
        // SELECT * FROM cart WHERE userId = id;
    } catch (error) {W
        
    }
})

module.exports = router;
