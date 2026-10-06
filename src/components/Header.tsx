const LOGO_SRC =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMgAAABBCAMAAACjORu8AAAAq1BMVEVHcEwHBgYPDQ4FBAQAAAAIBwgEBAQAAAAJCAgFBQUHBgYAAAAAAAADAgIPDQ4AAAAAAAAAAAAIBwcMCgoyMTIAAAD///8ICAj+/v4DAwMTExNdXV35+fkaGhqJiYnb29vW1tYMDAwjIyPBwcFnZ2ecnJz19fUrKytGRkbq6uq8vLy0tLRycnLu7u7Pz8/m5uaurq7GxsZSUlI7OzumpqaAgICSkpJBQUF6enpzKLHyAAAAFXRSTlMAF41Z5zp58gMlbMKXDLLZ+qVIMPyqou4RAAAEw0lEQVRo3u2aaZOqOhCGlU0WBRUDREXFBcVlGHGb///LbjqBUWeOGm/dYql73g9jdLSqHzrdnaVrtb/6/6hld3WlSSQoolxXqwmhamLTkNooFW5YpiK3queLbkfC6KcahqJVC0M02ug3B8gSqoOido02eixJqVeDo95soOcyulXgkI0Hk+o2VpTyR70oodfC7U7Jp5eqNxCfzHLHvMLLUXISnZ+DkJRvdrXqGhVXfFzVZL+qlyTw613BsCSqBnpP7FeW0RSvzlFB5CV3DP1p8eMUvtZ7WRBEXdTyrv9d402L/d5lda9Lz4e6Y4nMCS1dqJum3pPzDe73gqI/OI534fBe4W5yHPRJkRRabH2jqIJpmnJpkxTCyd5z/qzhLMEIMxIAEUwhTxDxLY5gFDoP5YUnF7UV8EjdVm1NtnPMzZr1FsfZc57I80YuanRp2so5Z6nNF6a702Vwfff1iCOcjKmrhluyLC6ipMg00PEURGIV+TBwwX42mB7jaH3IOA4R2Dz+oZ3jfKz6fjIGkriH2mIBIAKbMZs4jqMTyUhrMhgTwy9jMpgs0RkmzNpNvfMJpu6n/r2OTpjAv+fUXQuMzPwPKFppBVmACZ8YLeGRO3NiFLx+9DE1fdJn3+rt4N3M/TH7Fs6uB6+rIXXJEkl27ut1m6UsnNqNEmrLAlFPOEeM5jDzR+ke68t5AOJ9gb/OLFzmCOc/t8TUxAM863iKTszUgHmCBK6bLI7z1CH4+AjE2S0Gg2OamMljEPJfsWfVegJRfEHUfi+eBh/wnsQKdoPATWmD/RUk2I6+Rb5LSns4TDMaiahm/lsodPuwB5SHmLWaxhAaPkLJbDbbz1PajytI+s1M5wPRho33AeoUBoK2YMKJxTqZ5oeQBT8L+tFLkO13xmAgamEgF7B8AbEekxlyHsA0gQiuHIgP1WxNYt3bEKQNBH24egISnDeZ4lKB0DQ1IX+GXzEbOGP/CQjCmWiVLBEI1IiIuCVaEXN34J+N+wwE3T2C8oDQsuwNIVV9soFzQpUEmY7ZQnyNR+k2KXkK4mYKSgbiplXgzGyndf5ZsC/WmaJygaBRtlI6hFmB/vfpt7AlChFbL5Jlic8mGbP+DmTCBVLIEkX8vjvAdFXikZzLJpmX/AKh33gJ4h2LWDTK15OHYOakOZdOsmj5C+QScnmEjPNfxtdvjh5GuyjaQc5NYjLYsJ36ICLjr9vtiLP3+/3+9B7kRD7qs1U+2WTlv7HKtrosBJZEsPUIYODffMjG7jo7ZwAN70Bi+IjuH51Pt4jTB1XmP9W6hA6HdheE9SIupzq8HO6Rh8M7YWQUcmViS7xHpVwOWQSoUcRpEJQSvguF5YQDY3gmMSYU1K2iKjwk0xkHx2ROMnOnsKsrlePuc7l2vOcaxustyW7tZoF3iqr48iD7MHilFT0ilvRirxI1wUL/gaSmXStamt6xpAbTe9eJ6Y8ky1TsUjSlqXVNZnrvnj39kV3G1ro3SMxSd6O80YtS9qYtvu6HQnMt70aF4+q96FzLuVMRXnbQybVKSO2az/KwVZWexhrtMn3klSp1mVKUbtNq/6HvV68WBiv5d53Y7YZl6hXsxE79onVFRYDWeF20q9obn0V+7a/e1D8pXWuOh+x6mwAAAABJRU5ErkJggg=='

interface HeaderProps {
  title?: string
}

export function Header({ title = 'Enregistrements WiFi' }: HeaderProps) {
  return (
    <header className="dashboard-header">
      <div className="header-left">
        <img className="logo" src={LOGO_SRC} alt="Matrix Connect Logo" />
        <div className="header-title-block">
          <p className="header-kicker">Matrix Connect</p>
          <h1>{title}</h1>
        </div>
      </div>
      <div className="header-actions">
        <span className="refresh-indicator">
          <span className="dot" /> Manuel
        </span>
      </div>
    </header>
  )
}
