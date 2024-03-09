import { createSignal } from "solid-js";
import { IoSearch as SearchIcon } from "solid-icons/io";
import SearchResults from "./SearchResults";
import type { SearchResult } from "../types/types";
import "../styles/styles.scss";
import { Spinner } from "./Spinner";

function UploadForm() {
  // Create signals for each form input
  const [courseName, setCourseName] = createSignal("");
  const [exam, setExam] = createSignal("");
  const [searchResults, setSearchResults] = createSignal<SearchResult[]>([]);
  const [noResultsFound, setNoResultsFound] = createSignal<boolean>(false);
  const [awaitingResponse, setAwaitingResponse] = createSignal<boolean>(false);

  // Function to handle form submission
  const handleSubmit = async (event: any) => {
    event.preventDefault(); // Prevent the default form submit action

    if (!awaitingResponse()) {
      const params = new URLSearchParams();
      if (courseName()) params.append("course", courseName());
      if (exam()) params.append("exam", exam());

      try {
        setAwaitingResponse(true);
        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/search?${params}`, {
          method: "GET", // GET request
        });

        const data: SearchResult[] = await response.json();

        setSearchResults(data); // Handle the response data
        setNoResultsFound(data.length === 0); // Show a message if no results are found

        setAwaitingResponse(false);
      } catch (error) {
        setAwaitingResponse(false);
        console.error("Error fetching data:", error);
      }
    }
  };

  return (
    <div class="search-form">
      <h1>Upload a question paper!</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label for="course">Course Name:</label>
          <input autofocus={true} id="course" value={courseName()} onInput={(e) => setCourseName(e.target.value)} />
        </div>
        <div>
          <label for="exam">Exam:</label>
          <div class="select-wrapper">
            <select id="exam" value={exam()} onInput={(e) => setExam(e.target.value)}>
              <option value="">Mid / End Semester</option>
              <option value="midsem">Mid Semester</option>
              <option value="endsem">End Semester</option>
            </select>
          </div>
        </div>
        <button class="icon-btn" type="submit" disabled={awaitingResponse()}>
          Search <SearchIcon />
        </button>
      </form>
      {awaitingResponse() ? (
        <Spinner />
      ) : noResultsFound() ? (
        <p>No results found. Try another query.</p>
      ) : (
        <SearchResults results={searchResults()} />
      )}
    </div>
  );
}

export default UploadForm;
