const signInTab = document.getElementById("signInTab");
const signUpTab = document.getElementById("signUpTab");
const confirmPasswordField = document.getElementById("confirmPasswordField");
const form = document.getElementById("authForm");
const submitBtn = form.querySelector("button");

let isSignup = false;

/* ---------------- Toggle Logic ---------------- */

function switchToSignIn() {
    isSignup = false;
    confirmPasswordField.classList.add("hidden");
    submitBtn.innerText = "Sign In";

    signInTab.classList.add("text-dorado-800", "border-dorado-600");
    signInTab.classList.remove("text-dorado-500", "border-transparent");

    signUpTab.classList.remove("text-dorado-800", "border-dorado-600");
    signUpTab.classList.add("text-dorado-500", "border-transparent");
}

function switchToSignUp() {
    isSignup = true;
    confirmPasswordField.classList.remove("hidden");
    submitBtn.innerText = "Sign Up";

    signUpTab.classList.add("text-dorado-800", "border-dorado-600");
    signUpTab.classList.remove("text-dorado-500", "border-transparent");

    signInTab.classList.remove("text-dorado-800", "border-dorado-600");
    signInTab.classList.add("text-dorado-500", "border-transparent");
}

signInTab.addEventListener("click", switchToSignIn);
signUpTab.addEventListener("click", switchToSignUp);

/* ---------------- Submit Logic ---------------- */

form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const username = form.username.value.trim();
    const password = form.password.value.trim();
    const confirmPassword = form.confirmPassword?.value.trim();

    if (!username || !password) {
        showToast("All fields are required", "error");
        return;
    }

    if (isSignup && password !== confirmPassword) {
        showToast("Passwords do not match", "error");
        return;
    }

    try {
        submitBtn.disabled = true;
        submitBtn.innerText = "Processing...";

        const url = isSignup ? "/auth/register" : "/auth/login";

        const response = await axios.post(url, {
            username,
            password
        });

        showToast(response.data.message || "Success", "success");

        // Redirect after success
        setTimeout(() => {
            window.location.href = "/dashboard";
        }, 1000);

    } catch (error) {

        if (error.response && error.response.data.message) {
            showToast(error.response.data.message, "error");
        } else {
            showToast("Something went wrong", "error");
        }

    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = isSignup ? "Sign Up" : "Sign In";
    }
});