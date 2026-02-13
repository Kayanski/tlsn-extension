build: 
    rm -r zip ; npm run build && unzip -o -d zip zip/tlsn-extension-0.1.0.1202.zip 

websockify:
    docker run -it --rm -p 55688:80 novnc/websockify 80 app.revolut.com:443