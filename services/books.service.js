const mongoose = require("mongoose");
const axios = require("axios");

let Book, Search;
async function connect(uri) {
    if (mongoose.connection.readyState === 0) {
        await mongoose.connect(uri);
        const bookSchema = new mongoose.Schema({
            title: { type: String, required: true },
            author: { type: String, default: "" },
            year: { type: Number, default: null },
            coverBase64: { type: String, default: null },
            review: { type: String, default: "" },
            rating: { type: Number, min: 1, max: 5 }
        }, { timestamps: true })

        bookSchema.index({ createdAt: -1 }) // para ordenar por fecha
        bookSchema.index({ rating: 1 })     // para buscar por rating
        bookSchema.index({ title: "text", author: "text" }) // para búsquedas de texto

        Book = mongoose.models.Book || mongoose.model("Book", bookSchema);

        const searchSchema = new mongoose.Schema({ q: String, createdAt: { type: Date, default: Date.now } });
        Search = mongoose.models.Search || mongoose.model("Search", searchSchema);
    }
}

module.exports = {
    name: "books",
    async started() { await connect(process.env.MONGO_URI); this.logger.info("Mongo is OK"); },

    actions: {
        search: {
            params: { q: { type: "string", optional: true } },
            async handler(ctx) {
                const q = (ctx.params.q || "").trim();
                if (!q) return { items: [] };
                await Search.create({ q });

                let docs = [];
                try {
                    const { data } = await axios.get("https://openlibrary.org/search.json", { params: { q, limit: 10 } });
                    docs = Array.isArray(data?.docs) ? data.docs.slice(0, 10) : [];
                } catch (e) { this.logger.error("OpenLibrary:", e.message); }

                const saved = await Book.find().lean();
                const k = (t, a) => `${(t || "").toLowerCase()}|${(a || "").toLowerCase()}`;
                const map = new Map(saved.map(b => [k(b.title, b.author), b]));

                const items = docs.map(d => {
                    const title = d.title || "";
                    const author = Array.isArray(d.author_name) ? d.author_name[0] : (d.author_name || "");
                    const year = d.first_publish_year || null;
                    const found = map.get(k(title, author));
                    const cover = found
                        ? `/api/books/library/front-cover/${found._id}`
                        : (d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg` : null);
                    return { title, author, year, cover };
                });
                return { items };
            }
        },

        lastSearch: {
            async handler() {
                const last = await Search.find().sort({ createdAt: -1 }).limit(5).lean();
                return { searches: last.map(s => s.q) };
            }
        },

        create: {
            params: {
                title: "string",
                author: { type: "string", optional: true },
                year: { type: "number", optional: true, convert: true },
                coverBase64: { type: "string", optional: true },
                review: { type: "string", optional: true, max: 500 },
                rating: { type: "number", optional: true, convert: true, min: 1, max: 5 }
            },
            async handler(ctx) { return (await Book.create(ctx.params)).toObject(); }
        },

        list: {
            params: {
                q: { type: "string", optional: true },
                author: { type: "string", optional: true },
                excludeNoReview: { type: "boolean", optional: true, convert: true },
                sort: { type: "string", optional: true },
                // (opcional) pagina/limite
                page: { type: "number", optional: true, convert: true },
                pageSize: { type: "number", optional: true, convert: true }
            },
            async handler(ctx) {
                const { q, author, excludeNoReview, sort, page = 1, pageSize = 50 } = ctx.params;
                const query = {};
                if (q) query.title = { $regex: q, $options: "i" };
                if (author) query.author = { $regex: author, $options: "i" };
                if (excludeNoReview) query.review = { $exists: true, $ne: "" };

                const sortObj =
                    sort === "ratingAsc" ? { rating: 1 } :
                        sort === "ratingDesc" ? { rating: -1 } :
                            { createdAt: -1 };

                const skip = Math.max(0, (page - 1) * pageSize);

                // ⬇⬇ PROYECCIÓN: excluimos coverBase64
                const items = await Book.find(query)
                    .select("-coverBase64")
                    .sort(sortObj)
                    .skip(skip)
                    .limit(pageSize)
                    .lean();

                return items;
            }
        },

        get: { params: { id: "string" }, async handler(ctx) { return await Book.findById(ctx.params.id).lean(); } },

        update: {
            params: {
                id: "string",
                review: { type: "string", optional: true, max: 500 },
                rating: { type: "number", optional: true, convert: true, min: 1, max: 5 }
            },
            async handler(ctx) {
                const { id, review, rating } = ctx.params;
                const $set = {};
                if (review !== undefined) $set.review = review;
                if (rating !== undefined) $set.rating = rating;
                await Book.updateOne({ _id: id }, { $set });
                return await Book.findById(id).lean();
            }
        },

        remove: { params: { id: "string" }, async handler(ctx) { await Book.deleteOne({ _id: ctx.params.id }); return { ok: true }; } },

        frontCover: {
            params: { id: "string" },
            async handler(ctx) {
                const b = await Book.findById(ctx.params.id).lean();
                if (!b?.coverBase64) { ctx.meta.$statusCode = 404; return { error: "cover not found" }; }
                let mime = "image/jpeg"; let raw = b.coverBase64;
                const m = /^data:(.+);base64,(.*)$/i.exec(b.coverBase64 || "");
                if (m) { mime = m[1]; raw = m[2]; }
                ctx.meta.$responseType = mime;
                return Buffer.from(raw, "base64");
            }
        }
    }
};
