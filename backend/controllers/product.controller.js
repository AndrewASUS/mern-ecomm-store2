import { redis } from "../lib/redis.js"
import cloudinary from "../lib/cloudinary.js"
import Product from "../models/product.model.js"



// READ READ READ READ READ READ READ READ READ READ READ READ READ READ READ READ READ READ READ READ READ 
export const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find({})
    res.json({ products })
  } catch (error) {
    console.log("Error in getAllProducts controller", error.message)
    res.status(500).json({ message: "Server error", error: error.message })
  }
}




// READ READ READ READ READ READ READ READ READ READ READ READ READ READ READ READ READ READ READ READ READ
export const getFeaturtedProducts = async (req, res) => {
  try {
    let featuredProduts = await redis.get("featured_products")
    if (featuredProduts) {
      return res.json(JSON.parse(featuredProduts))
    }

    // If not in redis, find in MongoDB
    // .lean() tells Mongoose to return plain JavaScript objects instead of full Mongoose documents.
    featuredProduts = await Product.find({ isFeatured: true }).lean()

    if (!featuredProduts) {
      return res.status(404).json({ message: "No featured products found" })
    }

    // Strore in redis for future quick access
    await redis.set("featured_products", JSON.stringify(featuredProduts))

    res.json(featuredProduts)
  } catch (error) {
    console.log("Error in getFeaturtedProducts controller", error.message)
    res.status(500).json({ message: "Server error", error: error.message })
  }
}




// CREATE CREATE CREATE CREATE CREATE CREATE CREATE CREATE CREATE CREATE CREATE CREATE CREATE CREATE CREATE 
export const createProduct = async (req, res) => {
  try {
    const { name, description, price, image, category } = req.body

    let cloudinaryResponse = null

    if (image) {
      cloudinaryResponse = await cloudinary.uploader.upload(image, { folder: "products" })
    }

    const product = await Product.create({
      name,
      description,
      price,
      image: cloudinaryResponse?.secure_url ? cloudinaryResponse.secure_url : "",
      category
    })

    res.status(201).json(product)
  } catch (error) {
    console.log("Error in createProduct controller", error.message)
    res.status(500).json({ message: "Server error", error: error.message })
  }
}




// DELETE DELETE DELETE DELETE DELETE DELETE DELETE DELETE DELETE DELETE DELETE DELETE DELETE DELETE DELETE 
export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)

    if (!product) {
      return res.status(404).json({ message: "Product not found" })
    }

    if (product.image) {
      const publicId = product.image.split("/").pop().split(".")[0] // Grabs the ID of cloudinary image
      try {
        await cloudinary.uploader.destroy(`products/${publicId}`)
        console.log("Deleted image from cloudinary")
      } catch (error) {
        console.log("Error deleting image from cloudinary", error)
      }
    }

    await Product.findByIdAndDelete(req.params.id)

    res.json({ message: "Product deleted successfully" })
  } catch (error) {
    console.log("Error in deleteProduct controller", error.message)
    res.status(500).json({ message: "Server error", error: error.message })
  }
}




// READ READ READ READ READ READ READ READ READ READ READ READ READ READ READ READ READ READ READ READ READ 
export const getRecommendedProducts = async (req, res) => {
  try {
    const products = await Product.aggregate([
      {
        $sample: { size: 4 }
      },
      {
        $project: {
          _id: 1,
          name: 1,
          description: 1,
          image: 1,
          price: 1
        }
      }
    ])
    res.json(products)
  } catch (error) {
    console.log("Error in getRecommendedProducts controller", error.message)
    res.status(500).json({ message: "Server error", error: error.message })
  }
}




// READ READ READ READ READ READ READ READ READ READ READ READ READ READ READ READ READ READ READ READ READ 
export const getProductsByCategory = async (req, res) => {
  const { category } = req.params
  try {
    const products = await Product.find({ category })
    res.json({products})
  } catch (error) {
    console.log("Error in getProductsByCategory controller", error.message)
    res.status(500).json({ message: "Server errror", error: error.message })
  }
}




export const toggleFeaturedProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
    if (product) {
      product.isFeatured = !product.isFeatured
      const updatedProduct = await product.save()

      // Update cache - Redis
      await updateFeaturedProductCache()
      res.json(updatedProduct)
    } else {
      res.status(404).json({ message: "Product not found" })
    }
  } catch (error) {
    console.log("Error in toggleFeatureProduct controller", error.message)
    res.status(500).json({ message: "Sever error", error: error.message })
  }
}




async function updateFeaturedProductCache() {
  try {
    // .lean() tells Mongoose to return plain JavaScript objects instead of full Mongoose documents.
    const featuredProduts = await Product.find({ isFeatured: true }).lean()

    // Update cache - Redis
    await redis.set("featured_products", JSON.stringify(featuredProduts))
  } catch (error) {
    console.log("Error in updateFeaturedProductCache controller")
  }
}

