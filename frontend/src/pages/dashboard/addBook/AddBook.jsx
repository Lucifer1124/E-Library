import { useMemo } from "react";
import { useForm } from "react-hook-form";
import Swal from "sweetalert2";
import { useAddBookMutation } from "../../../redux/features/books/booksApi";

const categoryOptions = [
  "action",
  "drama",
  "romance",
  "sci-fi",
  "fantasy",
  "gore",
  "adventure",
  "crime",
  "thriller",
  "heartbreak",
];

const AddBook = () => {
  const { register, handleSubmit, reset, watch } = useForm({
    defaultValues: {
      title: "",
      author: "",
      description: "",
      category: "action",
      oldPrice: 0,
      newPrice: 0,
      coverImage: "",
      trending: false,
    },
  });
  const [addBook, { isLoading }] = useAddBookMutation();
  const selectedDocument = watch("document");
  const selectedFile = useMemo(() => selectedDocument?.[0] ?? null, [selectedDocument]);

  const onSubmit = async (data) => {
    try {
      await addBook({
        ...data,
        oldPrice: Number(data.oldPrice),
        newPrice: Number(data.newPrice),
        document: data.document?.[0],
      }).unwrap();

      reset();
      Swal.fire({
        title: "Book added",
        text: "Your book is now available in the catalog.",
        icon: "success",
      });
    } catch (error) {
      Swal.fire({
        title: "Add failed",
        text: error?.data?.message || "Unable to add this book.",
        icon: "error",
      });
    }
  };

  return (
    <div className="max-w-3xl rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-bold text-slate-900">Add a new book</h2>
      <p className="mt-2 text-sm text-slate-600">
        Every signed-in user can list books here. Admin can manage all listings afterward.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 grid gap-5 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">Title</label>
          <input
            type="text"
            {...register("title", { required: true })}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">Author</label>
          <input
            type="text"
            {...register("author", { required: true })}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500"
          />
        </div>

        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-semibold text-slate-700">Description</label>
          <textarea
            rows="5"
            {...register("description", { required: true })}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">Category</label>
          <select
            {...register("category", { required: true })}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500"
          >
            {categoryOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">Cover Image URL</label>
          <input
            type="text"
            {...register("coverImage", { required: true })}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500"
            placeholder="https://..."
          />
        </div>

        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Book Document
          </label>
          <input
            type="file"
            accept=".pdf,.txt,.doc,.docx,application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            {...register("document", { required: true })}
            className="w-full rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none file:mr-4 file:rounded-xl file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:font-semibold file:text-white focus:border-emerald-500"
          />
          <p className="mt-2 text-xs text-slate-500">
            Upload the purchased file in PDF, TXT, DOC, or DOCX format. Max size: 10MB.
          </p>
          {selectedFile ? (
            <p className="mt-2 text-sm font-medium text-slate-700">
              Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
            </p>
          ) : null}
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">Old Price</label>
          <input
            type="number"
            step="0.01"
            {...register("oldPrice", { required: true })}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">New Price</label>
          <input
            type="number"
            step="0.01"
            {...register("newPrice", { required: true })}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500"
          />
        </div>

        <label className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 md:col-span-2">
          <input type="checkbox" {...register("trending")} />
          <span className="text-sm font-semibold text-slate-700">Mark this book as trending</span>
        </label>

        <button
          type="submit"
          disabled={isLoading}
          className="rounded-2xl bg-emerald-600 px-4 py-3 font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70 md:col-span-2"
        >
          {isLoading ? "Saving..." : "Add Book"}
        </button>
      </form>
    </div>
  );
};

export default AddBook;
