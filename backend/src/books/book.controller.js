const path = require("path");
const Book = require("./book.model");
const Order = require("../orders/order.model");
const { getDocumentFilePath, removeUploadedDocument } = require("./book.upload");

const sanitizeBookPayload = (payload = {}) => ({
  title: payload.title?.trim(),
  author: payload.author?.trim(),
  description: payload.description?.trim(),
  category: payload.category?.trim().toLowerCase(),
  trending:
    payload.trending === true ||
    payload.trending === "true" ||
    payload.trending === "on" ||
    payload.trending === 1 ||
    payload.trending === "1",
  coverImage: payload.coverImage?.trim(),
  oldPrice: Number(payload.oldPrice || 0),
  newPrice: Number(payload.newPrice || 0),
});

const buildDocumentMetadata = (file) => {
  if (!file) {
    return null;
  }

  return {
    documentName: file.originalname?.trim(),
    documentMimeType: file.mimetype,
    documentSize: file.size,
    documentStorageName: file.filename,
  };
};

const toPublicBook = (book) => {
  if (!book) {
    return book;
  }

  const source = typeof book.toObject === "function" ? book.toObject() : { ...book };
  delete source.documentStorageName;
  delete source.__v;
  return source;
};

const validateBookPayload = (payload, file, existingBook) => {
  const requiredFields = [
    payload.title,
    payload.author,
    payload.description,
    payload.category,
    payload.coverImage,
  ];

  if (requiredFields.some((field) => !field)) {
    return "Title, author, description, category, and cover image are required.";
  }

  if (Number.isNaN(payload.oldPrice) || Number.isNaN(payload.newPrice)) {
    return "Book pricing must be valid numbers.";
  }

  if (payload.oldPrice < 0 || payload.newPrice < 0) {
    return "Book prices cannot be negative.";
  }

  if (!file && !existingBook?.documentStorageName) {
    return "A PDF, DOC, DOCX, or TXT document is required for every book.";
  }

  return null;
};

const canManageBook = (book, user) =>
  user.role === "admin" || book.sellerId.toString() === user._id.toString();

const userCanAccessDocument = async (book, user) => {
  if (canManageBook(book, user)) {
    return true;
  }

  return Order.exists({
    userId: user._id,
    "items.bookId": book._id,
  });
};

const postABook = async (req, res) => {
  try {
    const payload = sanitizeBookPayload(req.body);
    const validationError = validateBookPayload(payload, req.file);

    if (validationError) {
      await removeUploadedDocument(req.file?.filename);
      return res.status(400).json({ message: validationError });
    }

    const newBook = await Book.create({
      ...payload,
      sellerId: req.user._id,
      sellerUsername: req.user.username,
      ...buildDocumentMetadata(req.file),
    });

    return res
      .status(201)
      .json({ message: "Book saved successfully.", book: toPublicBook(newBook) });
  } catch (error) {
    console.error("Error creating book", error);
    await removeUploadedDocument(req.file?.filename);
    return res.status(500).json({ message: "Failed to create book." });
  }
};

const getAllBooks = async (req, res) => {
  try {
    const query = {};
    const search = req.query.search?.trim();
    const category = req.query.category?.trim().toLowerCase();

    if (search) {
      const searchRegex = new RegExp(search, "i");
      query.$or = [
        { title: searchRegex },
        { author: searchRegex },
        { description: searchRegex },
        { sellerUsername: searchRegex },
      ];
    }

    if (category && category !== "all") {
      query.category = category;
    }

    const books = await Book.find(query)
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json(books.map(toPublicBook));
  } catch (error) {
    console.error("Error fetching books", error);
    return res.status(500).json({ message: "Failed to fetch books." });
  }
};

const getMyBooks = async (req, res) => {
  try {
    const query = req.user.role === "admin" ? {} : { sellerId: req.user._id };

    const books = await Book.find(query)
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json(books.map(toPublicBook));
  } catch (error) {
    console.error("Error fetching seller books", error);
    return res.status(500).json({ message: "Failed to fetch your books." });
  }
};

const getSingleBook = async (req, res) => {
  try {
    const { id } = req.params;
    const book = await Book.findById(id).lean();

    if (!book) {
      return res.status(404).json({ message: "Book not found." });
    }

    return res.status(200).json(toPublicBook(book));
  } catch (error) {
    console.error("Error fetching book", error);
    return res.status(500).json({ message: "Failed to fetch book." });
  }
};

const updateBook = async (req, res) => {
  try {
    const { id } = req.params;
    const book = await Book.findById(id);

    if (!book) {
      return res.status(404).json({ message: "Book not found." });
    }

    if (!canManageBook(book, req.user)) {
      return res
        .status(403)
        .json({ message: "You do not have permission to edit this book." });
    }

    const payload = sanitizeBookPayload(req.body);
    const validationError = validateBookPayload(payload, req.file, book);

    if (validationError) {
      await removeUploadedDocument(req.file?.filename);
      return res.status(400).json({ message: validationError });
    }

    const previousStorageName = book.documentStorageName;
    Object.assign(book, payload);

    if (req.file) {
      Object.assign(book, buildDocumentMetadata(req.file));
    }

    await book.save();
    if (req.file && previousStorageName !== book.documentStorageName) {
      await removeUploadedDocument(previousStorageName);
    }

    return res.status(200).json({
      message: "Book updated successfully.",
      book: toPublicBook(book),
    });
  } catch (error) {
    console.error("Error updating book", error);
    await removeUploadedDocument(req.file?.filename);
    return res.status(500).json({ message: "Failed to update book." });
  }
};

const deleteABook = async (req, res) => {
  try {
    const { id } = req.params;
    const book = await Book.findById(id);

    if (!book) {
      return res.status(404).json({ message: "Book not found." });
    }

    if (!canManageBook(book, req.user)) {
      return res
        .status(403)
        .json({ message: "You do not have permission to delete this book." });
    }

    const { documentStorageName } = book;
    await book.deleteOne();
    await removeUploadedDocument(documentStorageName);

    return res.status(200).json({
      message: "Book deleted successfully.",
      bookId: id,
    });
  } catch (error) {
    console.error("Error deleting book", error);
    return res.status(500).json({ message: "Failed to delete book." });
  }
};

const getBookDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const book = await Book.findById(id);

    if (!book) {
      return res.status(404).json({ message: "Book not found." });
    }

    if (!book.documentStorageName) {
      return res.status(404).json({ message: "This book does not have a document yet." });
    }

    const canAccess = await userCanAccessDocument(book, req.user);

    if (!canAccess) {
      return res.status(403).json({ message: "Buy this book to access its document." });
    }

    const inlineMimeTypes = new Set(["application/pdf", "text/plain"]);
    const dispositionType = inlineMimeTypes.has(book.documentMimeType) ? "inline" : "attachment";
    const safeFileName = path.basename(book.documentName);

    res.setHeader("Content-Type", book.documentMimeType);
    res.setHeader("Content-Length", book.documentSize.toString());
    res.setHeader("Content-Disposition", `${dispositionType}; filename="${safeFileName}"`);

    return res.sendFile(getDocumentFilePath(book.documentStorageName));
  } catch (error) {
    console.error("Error serving book document", error);
    return res.status(500).json({ message: "Failed to load this document." });
  }
};

module.exports = {
  deleteABook,
  getAllBooks,
  getBookDocument,
  getMyBooks,
  getSingleBook,
  postABook,
  updateBook,
};
