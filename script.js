// Can improve this, this is just quick and dirty
document.addEventListener("DOMContentLoaded", () => {
    const overlay = document.querySelector(".modal-overlay");
    const cancelBtn = document.querySelector(".cancel-btn");

    console.log(overlay, cancelBtn);

    cancelBtn.addEventListener("click", () => {
        overlay.classList.add("hidden");
    });
});