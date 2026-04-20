import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { useParams } from "react-router-dom";
import Swal from "sweetalert2";
import Loading from "../../../components/Loading";
import { useFetchBookByIdQuery, useUpdateBookMutation } from "../../../redux/features/books/booksApi";

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

const UpdateBook = () => {
  const { id } = useParams();
  const { data: bookData, isLoading, isError } = useFetchBookByIdQuery(id);
  const [updateBook, { isLoading: isUpdating }] = useUpdateBookMutation();
  const { register, handleSubmit, reset, watch } = useForm();
  const selectedDocument = watch("document");
  const selectedFile = useMemo(() => selectedDocument?.[0] ?? null, [selectedDocument]);

  useEffect(() => {
    if (bookData) {
      reset({
        title: bookData.title,
        author: bookData.author,
        description: bookData.description,
        category: bookData.category,
        trending: bookData.trending,
        oldPrice: bookData.oldPrice,
        newPrice: bookData.newPrice,
        coverImage: bookData.coverImage,
      });
    }
  }, [bookData, reset]);

  const onSubmit = async (data) => {
    try {
      await updateBook({
        id,
        ...data,
        oldPrice: Number(data.oldPrice),
        newPrice: Number(data.newPrice),
        document: data.document?.[0],
      }).unwrap();

      Swal.fire({
        title: "Book updated",
        text: "The changes have been saved successfully.",
        icon: "success",
      });
    } catch (error) {
      Swal.fire({
        title: "Update failed",
        text: error?.data?.message || "Unable to update this book.",
        icon: "error",
      });
    }
  };

  if (isLoading) return <Loading />;
  if (isError) return <div className="rounded-[1.75rem] bg-white p-6 shadow-sm">Error fetching book data.</div>;

  return (
    <div className="max-w-3xl rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-bold text-slate-900">Edit book</h2>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 grid gap-5 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">Title</label>
          <input
            type="text"
            {...register("title", { required: true })}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-500"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">Author</label>
          <input
            type="text"
            {...register("author", { required: true })}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-500"
          />
        </div>

        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-semibold text-slate-700">Description</label>
          <textarea
            rows="5"
            {...register("description", { required: true })}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-500"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">Category</label>
          <select
            {...register("category", { required: true })}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-500"
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
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-500"
          />
        </div>

        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Replace Book Document
          </label>
          <input
            type="file"
            accept=".pdf,.txt,.doc,.docx,application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            {...register("document")}
            className="w-full rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none file:mr-4 file:rounded-xl file:border-0 file:bg-sky-600 file:px-4 file:py-2 file:font-semibold file:text-white focus:border-sky-500"
          />
          <p className="mt-2 text-xs text-slate-500">
            Leave this empty to keep the current purchased file. Supported: PDF, TXT, DOC, DOCX up to 10MB.
          </p>
          <p className="mt-2 text-sm text-slate-700">
            Current file: <span className="font-semibold">{bookData.documentName || "No file uploaded yet"}</span>
          </p>
          {selectedFile ? (
            <p className="mt-1 text-sm font-medium text-slate-700">
              New file: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
            </p>
          ) : null}
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">Old Price</label>
          <input
            type="number"
            step="0.01"
            {...register("oldPrice", { required: true })}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-500"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">New Price</label>
          <input
            type="number"
            step="0.01"
            {...register("newPrice", { required: true })}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-sky-500"
          />
        </div>

        <label className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 md:col-span-2">
          <input type="checkbox" {...register("trending")} />
          <span className="text-sm font-semibold text-slate-700">Keep this book in trending</span>
        </label>

        <button
          type="submit"
          disabled={isUpdating}
          className="rounded-2xl bg-sky-600 px-4 py-3 font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-70 md:col-span-2"
        >
          {isUpdating ? "Updating..." : "Save Changes"}
        </button>
      </form>
    </div>
  );
};

export default UpdateBook;
