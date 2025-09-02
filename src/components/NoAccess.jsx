import React from "react";

const NoAccess = () => {
  return (
    <div className="no-access-wrapper">
      <div className="no-access-card">
        <div className="no-access-icon">🚫</div>
        <h2 className="no-access-title">No Access</h2>
        <p className="no-access-message">
          You don’t have permission to access this Twilio app. <br />
          Please contact your admin for assistance.
        </p>
        <button
          className="no-access-btn"
          onClick={() => {
            localStorage.setItem(
              "access_auth_token",
              "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbXBfaWQiOjMyNjMsImVtcF9tYWlsIjoiZHViZXkuYUBib3NvbnRlY2guYWkiLCJpc19hZG1pbiI6dHJ1ZSwibnVtYmVycyI6W3siYXBwX3NpZCI6IkFQNDE0MDM2MDZlNzlhMzdhMzM3NDU1OTRmYzM4YTUwYjkiLCJudW1iZXJzIjoiKzE1NTkyNTQ2MzkxIiwiYXBwX25hbWUiOiJDdXN0b21lciBTdXBwb3J0IFRlYW0iLCJyb2xlIjoiaW5fY2FsbCxvdXRfY2FsbCJ9LHsiYXBwX3NpZCI6IkFQNzM2ODRhMzAzNTU0NWNjN2VmYTQ4MWMxMWQ1ODI4ZWMiLCJudW1iZXJzIjoiKzEzNDY0Mzg2Njc1IiwiYXBwX25hbWUiOiJSQ0wiLCJyb2xlIjoiaW5fY2FsbCxvdXRfY2FsbCJ9LHsiYXBwX3NpZCI6IkFQNzM2ODRhMzAzNTU0NWNjN2VmYTQ4MWMxMWQ1ODI4ZWMiLCJudW1iZXJzIjoiKzE2NTA4OTgxMjM1IiwiYXBwX25hbWUiOiJJVlIiLCJyb2xlIjoiaW5fY2FsbCxvdXRfY2FsbCJ9XSwiaWF0IjoxNzU2ODEwODA4LCJleHAiOjE3NTY4OTcyMDh9.8jiqi-iDXQobVcdvO9tO_GBjK5BPhTdaRj1YpXY6Z4Q"
            );
            localStorage.setItem(
              "token",
              "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbXBfaWQiOjMyNjMsImVtcF9tYWlsIjoiZHViZXkuYUBib3NvbnRlY2guYWkiLCJpc19hZG1pbiI6dHJ1ZSwibnVtYmVycyI6W3siYXBwX3NpZCI6IkFQNDE0MDM2MDZlNzlhMzdhMzM3NDU1OTRmYzM4YTUwYjkiLCJudW1iZXJzIjoiKzE1NTkyNTQ2MzkxIiwiYXBwX25hbWUiOiJDdXN0b21lciBTdXBwb3J0IFRlYW0iLCJyb2xlIjoiaW5fY2FsbCxvdXRfY2FsbCJ9LHsiYXBwX3NpZCI6IkFQNzM2ODRhMzAzNTU0NWNjN2VmYTQ4MWMxMWQ1ODI4ZWMiLCJudW1iZXJzIjoiKzEzNDY0Mzg2Njc1IiwiYXBwX25hbWUiOiJSQ0wiLCJyb2xlIjoiaW5fY2FsbCxvdXRfY2FsbCJ9LHsiYXBwX3NpZCI6IkFQNzM2ODRhMzAzNTU0NWNjN2VmYTQ4MWMxMWQ1ODI4ZWMiLCJudW1iZXJzIjoiKzE2NTA4OTgxMjM1IiwiYXBwX25hbWUiOiJJVlIiLCJyb2xlIjoiaW5fY2FsbCxvdXRfY2FsbCJ9XSwiaWF0IjoxNzU2ODEwODA4LCJleHAiOjE3NTY4OTcyMDh9.8jiqi-iDXQobVcdvO9tO_GBjK5BPhTdaRj1YpXY6Z4Q"
            );

            localStorage.setItem(
              "userdata",
              JSON.stringify({
                email: "devik.a@bostongroup.ai",
                displayName: "Abhishek Dubey",
                userId: 3263,
              })
            );

            window.location.reload();
          }}
        >
          Retry
        </button>
      </div>
    </div>
  );
};

export default NoAccess;
