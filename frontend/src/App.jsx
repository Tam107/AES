import { useEffect, useState } from "react";
import { Toaster } from 'react-hot-toast';

import HomePage from "./pages/HomePage";
import { Route, Routes } from "react-router";

function App() {
  // const [count, setCount] = useState(0)
  const [otp, setOtp] = useState("");
  const [emailErrol, setEmailErrol] = useState();
  useEffect(() => {
    const fetchApi = async () => {
    };
    fetchApi();
  }, []);
  return (
    <>
      <Toaster />
      <Routes>
        <Route
          path="/"
          element={
            <HomePage />
          }
        />
      </Routes>
    </>
  );
}

export default App;
