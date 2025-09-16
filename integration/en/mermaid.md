# Mermaid

```mermaid
graph TB
    P(["Incoming"]):::orange
    A1["`Lorem ipsum test, 
    test test test test. 
    **bold spam test**`"]:::blue
    A2["`Lorem ipsum dolor sit amet,
    consectetur adipiscing elit. Integer dictum,
    ex mattis porttitor vulputate, nisl **mauris pretium nisi, eget tempus quam**`"]:::blue

    P --> A1
    A1 --> A2

    classDef orange fill:#ffeee7,stroke:#ffeee7,stroke-width:2px;
    classDef blue fill:#deebff,stroke:#deebff,stroke-width:2px,rx:5,ry:5;
```