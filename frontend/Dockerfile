FROM nginx:alpine

COPY index.html /usr/share/nginx/html/
COPY styles.css /usr/share/nginx/html/
COPY app.js /usr/share/nginx/html/
COPY web.js /usr/share/nginx/html/
COPY dangerzones.json /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY custom-location-icon.png /usr/share/nginx/html/
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]