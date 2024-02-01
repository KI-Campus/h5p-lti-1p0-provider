async function requestCreateTempUser() {
  try {
    document.getElementById("createUserDiv").innerText = "Creating new user...";

    const response = await fetch("../create_temp_user", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (response.status !== 200) {
      console.error("Error creating new user:", response);
      document.getElementById("createUserDiv").innerText =
        "Error creating new user";
      return;
    }
    const data = await response.json();

    document.getElementById("createUserDiv").innerHTML =
      "<h4>User created</h4>" +
      "Please use this token to login to the LRS." +
      "<br />Magic token: " +
      data.user?.magicLoginToken +
      "<br />Link to the LRS: <a target='_blank' href='" +
      data.lrsUrl +
      "login-magic-token/" +
      data.user?.magicLoginToken +
      "'>" +
      data.lrsUrl +
      "login-magic-token/" +
      data.user?.magicLoginToken +
      "</a>" +
      "<br /> It will be expired on: " +
      new Date(data.user?.expireAt).toLocaleString();
  } catch (error) {
    console.error("Error creating new user:", error);
  }
}
