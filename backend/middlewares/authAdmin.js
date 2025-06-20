import jwt from 'jsonwebtoken';

const authAdmin = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.json({ success: false, message: "Not Authorized Login Again" });
        }

        const token = authHeader.split(' ')[1];
        if (!token) {
            return res.json({ success: false, message: "Not Authorized Login Again" });
        }

        const token_decode = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        if (token_decode.id !== 'admin') {
            return res.json({ success: false, message: "Not Authorized" });
        }

        next();
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

export default authAdmin; 