import { useState } from "react";
import CreatableAdvanced from "../components/CreateableSelect";
import {
  getStorage,
  uploadBytesResumable,
  ref,
  getDownloadURL,
} from "firebase/storage";
import { app } from "../firebase.js";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

export default function CreateListing() {
  const [files, setFiles] = useState([]);
  const [formData, setFormData] = useState({
    imageUrls: [],
    name: "",
    description: "",
    inventory: 0,
    unit: "",
    regularPrice: 0,
    discountPrice: 0,
    category: "",
    offer: false,
  });
  const [imageUploadError, setImageUploadError] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const { currentUser } = useSelector((state) => state.user);
  const navigate = useNavigate();
  console.log(formData);

  const handleImageSubmit = (e) => {
    if (files.length > 0 && files.length + formData.imageUrls.length < 7) {
      setUploading(true);
      setImageUploadError(false);
      const promises = [];

      for (let i = 0; i < files.length; i++) {
        promises.push(storeImage(files[i]));
      }
      Promise.all(promises)
        .then((urls) => {
          setFormData({
            ...formData,
            imageUrls: formData.imageUrls.concat(urls),
          });
          setImageUploadError(false);
          setUploading(false);
        })
        .catch((err) => {
          setImageUploadError("Image upload failed(2MB max per image)");
          setUploading(false);
        });
    } else {
      if (files.length <= 0) {
        setImageUploadError("No image being selected");
      } else {
        setImageUploadError("You can only upload 6 images per listing");
      }
      setUploading(false);
    }
  };

  const storeImage = async (file) => {
    return new Promise((resolve, reject) => {
      const storage = getStorage(app);
      const fileName = new Date().getTime() + file.name;
      const storageRef = ref(storage, fileName);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress =
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log(`Upload is ${progress}% done`);
        },
        (error) => {
          reject(error);
        },
        () => {
          getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
            resolve(downloadURL);
          });
        }
      );
    });
  };

  const handleRemoveImage = (index) => {
    setFormData({
      ...formData,
      imageUrls: formData.imageUrls.filter((_, i) => i !== index),
    });
  };

  const handleChange = (e) => {
    if (e.target.id === "offer") {
      setFormData({
        ...formData,
        [e.target.id]: e.target.checked,
      });
    }
    if (e.target.type === "text" || e.target.type === "textarea") {
      setFormData({
        ...formData,
        [e.target.id]: e.target.value,
      });
    }
    if (e.target.type === "number") {
      setFormData({
        ...formData,
        [e.target.id]: Number(e.target.value),
      });
    }
  };

  const handleCreatableChange = (e) => {
    setFormData({
      ...formData,
      category: e ? e.value : "",
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      console.log(formData.regularPrice, formData.discountPrice);
      if (formData.regularPrice < formData.discountPrice) {
        console.log(formData.regularPrice, formData.discountPrice);
        return setError("Discount price must be lower than regular price");
      }
      if (formData.imageUrls.length < 1) {
        return setError("You must upload at leat one image");
      }

      setLoading(true);
      setError(false);
      const res = await fetch("http://localhost:3000/api/listing/create", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...formData, userRef: currentUser._id }),
      });
      const data = await res.json();
      setLoading(false);
      if (data.success === false) {
        setError(data.message);
      }
      navigate(`/listing/${data._id}`);
    } catch (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  return (
    <main className="p-3 max-w-4xl mx-auto">
      <h1 className="text-3xl font-semibold text-center my-7">
        Create a Product
      </h1>
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4">
        <div className="flex flex-col gap-4 flex-1">
          <input
            type="text"
            placeholder="Name"
            className="border p-3 rounded-lg"
            id="name"
            maxLength="62"
            minLength="1"
            required
            onChange={handleChange}
            value={formData.name}
          />
          <textarea
            type="text"
            placeholder="Description"
            className="border p-3 rounded-lg"
            id="description"
            required
            onChange={handleChange}
            value={formData.description}
          />
          <CreatableAdvanced onChange={handleCreatableChange} />
          <div className="flex gap-6 flex-wrap">
            <div className="flex gap-2">
              <input
                type="checkbox"
                id="offer"
                className="w-5"
                onChange={handleChange}
                checked={formData.offer}
              />
              <span>Offer</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-2">
              <div className="flex flex-col items-center">
                <p>Inventory</p>
                <span className="text-xs">(unlimited = -1)</span>
              </div>
              <input
                type="number"
                placeholder="0"
                id="inventory"
                min="-1"
                max="99999"
                required
                className="p-3 border
                border-gray-300
                rounded-lg"
                onChange={handleChange}
                value={formData.inventory}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Unit"
                id="unit"
                required
                className="p-3 border
                border-gray-300
                rounded-lg"
                onChange={handleChange}
                value={formData.unit}
              />
            </div>
            <div className="flex items-center gap-2">
              <div className="flex flex-col items-center">
                <p>Regular price</p>
                <span className="text-xs">(per unit)</span>
              </div>
              <input
                type="number"
                placeholder="0"
                id="regularPrice"
                min="0"
                max="99999999"
                required
                className="p-3 border
                border-gray-300
                rounded-lg"
                onChange={handleChange}
                value={formData.regularPrice}
              />
            </div>
            {formData.offer && (
              <div className="flex items-center gap-2">
                <div className="flex flex-col items-center">
                  <p>Discount price</p>
                  <span className="text-xs">(per unit)</span>
                </div>
                <input
                  type="number"
                  placeholder="0"
                  id="discountPrice"
                  min="0"
                  max="99999999"
                  required
                  className="p-3 border
                border-gray-300
                rounded-lg"
                  onChange={handleChange}
                  value={formData.discountPrice}
                />
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-col flex-1 gap-4">
          <p className="font-semibold">
            Images:
            <span className="='font-normal text-gray-600 ml-2">
              The first image will be the cover(max 6)
            </span>
          </p>
          <div className="flex gap-4">
            <input
              onChange={(e) => setFiles(e.target.files)}
              className="p-3 border border-grey-300 rounded w-full"
              type="file"
              id="images"
              accept="image/*"
              multiple
            />
            <button
              type="button"
              disabled={uploading}
              onClick={handleImageSubmit}
              className="p-3 text-green-700 border border-green-700 rounded uppercase hover:shadow-lg disabled:opacity-80"
            >
              {uploading ? "Uploading..." : "Upload"}
            </button>
          </div>
          <p className="text-red-700 text-sm">
            {imageUploadError && imageUploadError}
          </p>
          {formData.imageUrls.length > 0 &&
            formData.imageUrls.map((url, index) => (
              <div
                key={url}
                className="flex justify-between p-3 border items-center"
              >
                <img
                  src={url}
                  alt="image"
                  className="w-20 h-20 object-contain rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveImage(index)}
                  className="p-3 text-red-700 rounded-lg uppercase hover:opacity-75"
                >
                  Delete
                </button>
              </div>
            ))}
          <button
            disabled={loading || uploading}
            className="p-3 bg-slate-700 text-white rounded-lg uppercase hover:opacity-95 disabled: opacity-80"
          >
            {loading ? "Creating" : "Create product"}
          </button>
          {error && <p className="text-red-700 text-sm">{error}</p>}
        </div>
      </form>
    </main>
  );
}
