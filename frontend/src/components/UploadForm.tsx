import { createSignal } from "solid-js";
import { IoSearch as SearchIcon } from "solid-icons/io";
import SearchResults from "./SearchResults";
import type { SearchResult } from "../types/types";
import "../styles/styles.scss";
import { Spinner } from "./Spinner";
// import json from a json file
import courses from "../assets/courses.json";

function UploadForm() {
  // Create signals for each form input
  const [courseName, setCourseName] = createSignal("");
  const [exam, setExam] = createSignal("");
  const [semester, setSemester] = createSignal("spring");
  const [year, setYear] = createSignal("2020");
  const [awaitingResponse, setAwaitingResponse] = createSignal<boolean>(false);
  const [file, setFile] = createSignal<File | null>(null);

  // Function to handle form submission
  const handleSubmit = async (event: any) => {
    event.preventDefault(); // Prevent the default form submit action

    if (!awaitingResponse()) {
      const formData = new FormData();
      if (courseName()) formData.append("course", courseName());
      if (file()) formData.append("file", file() || "");
      if (year()) formData.append("year", year());
      if (semester()) formData.append("semester", semester());
      try {
        setAwaitingResponse(true);
        const response = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/upload`,
          {
            method: "POST",
            body: formData,
          }
        );

        const data: SearchResult[] = await response.json();

        setAwaitingResponse(false);
      } catch (error) {
        setAwaitingResponse(false);
        console.error("Error fetching data:", error);
      }
    }
  };

  function handleFileChange(
    e: Event & { currentTarget: HTMLInputElement; target: HTMLInputElement }
  ) {
    const file: File | null = e.target.files?.[0] || null;

    setFile(file);
    console.log(file);
  }
  function getYears() {
    let years = [];
    for (let i = 2012; i <= 2024; i++) {
      years.push(i);
    }
    return years;
  }
  const years = getYears();

  return (
    <div class="search-form">
      <h1>Upload a question paper!</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label for="course_name">Course Name</label>
          <div class="select-wrapper">
            <select
              id="course_name"
              value={courseName()}
              required
              onInput={(e) => setCourseName(e.target.value)}
            >
              {courses.courses.map((c) => (
                <option value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label for="year">Year</label>
          <div class="select-wrapper">
            <select
              id="exam"
              value={year()}
              onInput={(e) => setYear(e.target.value)}
            >
              {years.map((y) => {
                return <option value={y}>{y}</option>;
              })}
            </select>
          </div>
        </div>
        <div>
          <label for="semester">Semester</label>
          <div class="select-wrapper">
            <select
              id="exam"
              value={semester()}
              onInput={(e) => setSemester(e.target.value)}
            >
              <option value="spring">Spring Semester</option>
              <option value="autumn">Autumn Semester</option>
            </select>
          </div>
        </div>
        <div>
          <label for="exam">Exam</label>
          <div class="select-wrapper">
            <select
              id="exam"
              value={exam()}
              onInput={(e) => setExam(e.target.value)}
            >
              <option value="">Mid / End Semester</option>
              <option value="midsem">Mid Semester</option>
              <option value="endsem">End Semester</option>
            </select>
          </div>
        </div>
        <div>
          <label for="file">Question Paper</label>
          <input
            type="file"
            id="file"
            accept=".pdf"
            required
            onChange={(e) => handleFileChange(e)}
          />
        </div>
        <button class="icon-btn" type="submit" disabled={awaitingResponse()}>
          Submit
        </button>
      </form>
      {awaitingResponse() ? (
        <Spinner />
      ) : null ? (
        <p>No results found. Try another query.</p>
      ) : null}
    </div>
  );
}

export default UploadForm;
