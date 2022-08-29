import {Box} from "@contentful/f36-components";
import React, {useEffect, useState} from "react";


const Preview = ({media}: any) => {

    const [iframeSrc, setIframeSrc] = useState('');

    useEffect(() => {

        console.log('iframeSrc', iframeSrc);

        if (media !== undefined && media.type === 'video') {
            const {url} = media;
            const getWistiaIdFromUrl = (url: string): string => {
                return url.split('wistia.com/medias/')[1];
            }
            setIframeSrc(`https://fast.wistia.net/embed/iframe/${getWistiaIdFromUrl(url)}`);
        }

        if (media !==undefined && media.hashed_id !== undefined) {
            setIframeSrc(`https://fast.wistia.net/embed/iframe/${media.hashed_id}`);
        }
    }, [media]);

    return (
        <Box
            as="div"
            id="wistia_upload_preview"
            style={{
                width: "100%",
                height: "360px",
            }}
        >
            <iframe
                src={iframeSrc}
                frameBorder="0"
                scrolling="no"
                className="wistia_embed"
                name="wistia_embed"
                allowFullScreen
                width="100%"
                height="100%"
            ></iframe>
        </Box>
    );

}

export default Preview;