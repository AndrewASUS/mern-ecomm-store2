import jwt from "jsonwebtoken"

import { redis } from "../lib/redis.js"
import User from "../models/user.model.js"




// UTILITY FUNCTIONS UTILITY FUNCTIONS UTILITY FUNCTIONS UTILITY FUNCTIONS UTILITY FUNCTIONS UTILITY FUNCTIONS 
const generateTokens = (userId) => {
  const accessToken = jwt.sign({ userId }, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: "15m",
  })

  const refreshToken = jwt.sign({ userId }, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: "7d",
  })

  return { accessToken, refreshToken }
}




const setCookies = (res, accessToken, refreshToken) => {
  const isProd = process.env.NODE_ENV === "production";

  res.cookie("accessToken", accessToken, {
    httpOnly: true, // Prevents XXS attacks "CROSS SITE SCRIPTING ATTACKS"
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    maxAge: 15 * 60 * 1000, // 15 Minutes
  });

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax", 
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 Days
  });
};




// Save the refresh token to the database
const storeRefreshToken = async (userId, refreshToken) => {
  await redis.set(`refresh_token:${userId}`, refreshToken, "EX", 7 * 24 * 60 * 60) // 7 Days 7*24*60*60
}




// SIGNUP SIGNUP SIGNUP SIGNUP SIGNUP SIGNUP SIGNUP SIGNUP SIGNUP SIGNUP SIGNUP SIGNUP SIGNUP SIGNUP SIGNUP SIGNUP 
export const signup = async (req, res) => {
  const { email, password, name } = req.body
  try {
    const userExists = await User.findOne({ email })

    if (userExists) {
      return res.status(400).json({ message: "User already exists" })
    }

    const user = await User.create({ name, email, password })

    // Authenticate user Authenticate user
    const { accessToken, refreshToken } = generateTokens(user._id)
    await storeRefreshToken(user._id, refreshToken)

    setCookies(res, accessToken, refreshToken)


    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    })
  } catch (error) {
    console.log("Error in signup controller")
    res.status(500).json({ message: error.message })
  }
}




// LOGIN LOGIN LOGIN LOGIN LOGIN LOGIN LOGIN LOGIN LOGIN LOGIN LOGIN LOGIN LOGIN LOGIN LOGIN LOGIN LOGIN LOGIN LOGIN 
export const login = async (req, res) => {
  try {
    const { email, password } = req.body
    const user = await User.findOne({ email })
    if (user && (await user.comparePassword(password))) {
      const { accessToken, refreshToken } = generateTokens(user._id)
      await storeRefreshToken(user._id, refreshToken)
      setCookies(res, accessToken, refreshToken)
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      })
    } else {
      res.status(400).json({ message: "Invalid email or password" })
    }
  } catch (error) {
    console.log("Error in login controller")
    return res.status(500).json({ message: error.message })
  }
}




// LOGOUT LOGOUT LOGOUT LOGOUT LOGOUT LOGOUT LOGOUT LOGOUT LOGOUT LOGOUT LOGOUT LOGOUT LOGOUT LOGOUT LOGOUT LOGOUT LOGOUT 
export const logout = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken
    if (refreshToken) {
      const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET)
      await redis.del(`refresh_token:${decoded.userId}`)
    }

    res.clearCookie("accessToken")
    res.clearCookie("refreshToken")
    res.json({ message: 'Logged out successfully' })
  } catch (error) {
    console.log("Error in logout controller")
    res.status(500).json({ message: "Server error", error: error.message })
  }
}




// REFRESH TOKEN REFRESH TOKEN REFRESH TOKEN REFRESH TOKEN REFRESH TOKEN REFRESH TOKEN REFRESH TOKEN REFRESH TOKEN 
export const refreshToken = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken

    if (!refreshToken) {
      return res.status(401).json({ message: "No refresh token provided" })
    }

    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET)
    const storedToken = await redis.get(`refresh_token:${decoded.userId}`)

    if (storedToken !== refreshToken) {
      return res.status(401).json({ message: "Invalid refresh token" })
    }

    const accessToken = jwt.sign({ userId: decoded.userId }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "15m" })

    res.cookie("accessToken", accessToken, {
      httpOnly: true, // Prevents XXS attacks "CROSS SITE SCRIPTING ATTACKS"
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict", // Prevents CSRF attacks "CROSS SITE REQUEST FORGERY"
      maxAge: 15 * 60 * 1000 // 15 Minutes
    })

    res.json({ message: "Token refreshed successfully" })
  } catch (error) {
    console.log("Error in refreshToken controller", error.message)
    res.status(500).json({ message: "Server error", error: error.message })
  }
}




// READ PROFILE READ PROFILE READ PROFILE READ PROFILE READ PROFILE READ PROFILE READ PROFILE READ PROFILE READ PROFILE 
export const getProfile = async (req, res) => {
  try {
    res.json(req.user)
  } catch (error) {
    console.log("Error in getProfile controller", error)
    res.status(500).json({ message: "Server error", error: error.message })
  }
}
