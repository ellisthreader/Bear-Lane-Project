import React from "react";

export default function StartProject() {
  return (
    <div className="p-12 max-w-3xl mx-auto bg-white rounded-2xl shadow-lg">
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Start Your Project</h1>
      <p className="text-gray-600 mb-6">
        Welcome! Here you can provide details about your project and get started with us.
      </p>
      {/* Example form / content */}
      <form className="flex flex-col gap-4">
        <input
          type="text"
          placeholder="Project Name"
          className="border border-gray-300 rounded-xl px-4 py-2"
        />
        <input
          type="email"
          placeholder="Your Email"
          className="border border-gray-300 rounded-xl px-4 py-2"
        />
        <textarea
          placeholder="Project Details"
          className="border border-gray-300 rounded-xl px-4 py-2"
        />
        <button
          type="submit"
          className="px-6 py-3 bg-[#C9A24D] text-white rounded-2xl font-semibold hover:opacity-90 transition"
        >
          Submit
        </button>
      </form>
    </div>
  );
}
