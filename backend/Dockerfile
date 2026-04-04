FROM golang:1.26.1-alpine AS builder
ARG TARGETARCH
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=${TARGETARCH} go build -o server ./cmd/freshkitchen

FROM alpine:3.19
RUN apk --no-cache add ca-certificates
WORKDIR /app
COPY --from=builder /app/server .
RUN mkdir -p /app/uploads
EXPOSE 8080
CMD ["./server"]
