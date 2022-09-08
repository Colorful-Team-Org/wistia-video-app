import React, {useCallback, useEffect, useState} from 'react';
import {useFieldValue, useSDK} from '@contentful/react-apps-toolkit';
import {FieldExtensionSDK} from "@contentful/app-sdk";
import {
    Box,
    Button,
    Flex,
    FormControl,
    Heading,
    IconButton,
    Paragraph,
    Stack,
    TextInput,
    Text,
    TextLink,
    Tooltip
} from "@contentful/f36-components";
import {Notification} from '@contentful/f36-notification';
import tokens from "@contentful/f36-tokens";
import {EditIcon, ExternalLinkTrimmedIcon, DoneIcon} from '@contentful/f36-icons';
import CancelUpload from "./components/CancelUpload";
import ProgressBar from "./components/ProgressBar";
import ButtonRetry from "./components/ButtonRetry";
import loadScript from '../../utils/loadScript';
import {Medias} from "../../utils/types";

declare global {
    interface Window {
        _wapiq: any;
        _wq: any;
        wistiaUploader: any;
    }
}

const Wistia = (props: any) => {
    const sdk = useSDK<FieldExtensionSDK>();

    const {viewVideosList} = props;

    const uploaderConfig = {
        accessToken: sdk.parameters.installation.accessToken,
        projectId: sdk.parameters.installation.projectId,
        dropZone: "wistia_upload_drop_zone",
        dropZoneClickable: false,
        customButton: true,
        button: "wistia_upload_button",
    }

    const [status, setStatus] = useState("Drag and drop a video file to upload...");
    const [progress, setProgress] = useState("");
    const [retry, setRetry] = useState(false);
    const [uploadActive, setUploadActive] = useState(false);
    const [editNameShow, setEditNameShow] = useState(false);

    const [fileName, setFileName] = useState('');
    const [wistiaUrl, setWistiaUrl] = useState('');
    const [media, setMedia] = useFieldValue<Medias[] | undefined>();


    const filterErrorMessage = (error: string, query: string) => {
        return error.includes(query);
    }

    const uploadStart = (file: any) => {
        setStatus('Your video upload is starting...');
        setFileName(file.name);
        setUploadActive(true);
    }

    const uploadProgress = (file: any, progress: any) => {
        setStatus('Sending pixie dust to Wistia...');
        setProgress(Math.round(progress * 100) + "%");
    }

    const uploadCancelled = (file: any) => {
        setStatus('');
        setFileName('');
        setUploadActive(false);
        setRetry(true);
    }

    const uploadFailed = useCallback((file: any, errorResponse: any) => {
        const error = errorResponse.error.message.toString();

        const res1 = error.lastIndexOf(":\"");
        const res2 = error.lastIndexOf("\"}");
        const response = error.substring(res1 + 2, res2);

        //TODO: remove console.log(<error filter>)
        if (filterErrorMessage(error, '401')) {
            console.log(`Upload failed: 401, access denied. ${response}`);
        }

        if (filterErrorMessage(error, '403')) {
            console.log(`Upload failed: 403, forbidden. ${response}`);
        }

        if (filterErrorMessage(error, '404')) {
            console.log(`Upload failed: 404, not found. ${response}`);
        }

        Notification.error(`${response}`, {
            cta: {
                label: 'Try again',
                textLinkProps: {
                    variant: 'primary',
                    onClick: () => {
                        Notification.closeAll();
                        window.location.reload();
                    }
                },
            }
        });

        setStatus('');
        setFileName('');
        setUploadActive(false);
        setRetry(true);
    }, []);

    const uploadSuccess = useCallback((file: any, media: any) => {
        setStatus('');
        setUploadActive(false);
        setRetry(true);

        if (media !== undefined) {
            const setMediaRef = async () => {
                const response = await fetch(`https://api.wistia.com/v1/medias/${media.id}.json`, {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${sdk.parameters.installation.accessToken}`
                    }
                }).then(response => {
                    if (response.status === 200) {
                        return response.json();
                    }
                }).catch(error => {
                    return error;
                });
                setMedia(response);
            }
            setMediaRef();
        }
        // TODO: remove console.log
        console.log(`Upload media`, media)

        return window.wistiaUploader.unbind;
    }, [setMedia]);

    const updateName = async (media: any) => {
        const response = await fetch(`https://api.wistia.com/v1/medias/${media.hashed_id}.json?name=${fileName}`, {
            method: 'PUT',
            headers: {
                Authorization: `Bearer ${sdk.parameters.installation.accessToken}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            }
        }).then(response => {
            if (response.status === 200) {
                console.log(`Name updated successfully, response: `, response);
                sdk.entry.fields.externalVideo.setValue({...media, name: fileName})
                return response.json();
            }
        }).catch(error => {
            return error;
        });
    }


    useEffect(() => {
        loadScript('//fast.wistia.com/assets/external/api.js').then(() => {
            window._wapiq = window._wapiq || [];
            window._wapiq.push(function (W: any) {
                window.wistiaUploader = new W.Uploader({
                    ...uploaderConfig,
                });

                window.wistiaUploader
                    .bind('uploadstart', uploadStart)
                    .bind('uploadprogress', uploadProgress)
                    .bind('uploadcancelled', uploadCancelled)
                    .bind('uploadfailed', uploadFailed)
                    .bind('uploadsuccess', uploadSuccess);

            });
        }).catch((error) => {
            console.log('Error loading Wistia script', error);
        });

        return () => {
            window._wapiq.push({
                revoke: uploaderConfig,
            });
        };
    }, [uploadFailed, uploadSuccess]);

    useEffect(() => {
        if (media !== undefined) {
            // @ts-ignore
            setFileName(media.name);
            // @ts-ignore
            setWistiaUrl(`https://contentful.wistia.com/medias/${media.hashed_id}`);

        } else {
            setFileName('');
        }
    }, [media]);

    return (
        <>
            <Stack style={{marginBottom: '1rem'}}>
                {!editNameShow &&
                    <>
                        <Heading style={{margin: 0}}>{fileName}</Heading>
                        {fileName !== '' &&
                            <Tooltip content={uploadActive ? 'You cannot edit the name while uploading' : 'Edit video name'}>
                                <IconButton
                                    aria-label="Edit Video Name"
                                    icon={<EditIcon/>}
                                    variant="secondary"
                                    size="small"
                                    onClick={() => setEditNameShow(!editNameShow)}
                                    isDisabled={uploadActive}
                                />
                            </Tooltip>
                        }
                    </>
                }
                {editNameShow &&
                    <FormControl
                        isRequired
                        isInvalid={!fileName}
                        style={{width: '100%', marginBottom: '0'}}>
                        <TextInput.Group>
                            <TextInput
                                aria-label="Video Name"
                                value={fileName}
                                type="text"
                                name="text"
                                placeholder="Enter new video name"
                                size="small"
                                onChange={(e) => setFileName(e.target.value)}
                            />
                            <IconButton
                                aria-label="Edit Done"
                                icon={<DoneIcon/>}
                                variant="positive"
                                size="small"
                                onClick={() => {
                                    setEditNameShow(!editNameShow)
                                    updateName(media);
                                }}
                            />
                        </TextInput.Group>
                        {!fileName && (
                            <FormControl.ValidationMessage>
                                Please, provide a video name
                            </FormControl.ValidationMessage>
                        )}
                    </FormControl>
                }
                {uploadActive &&
                    <CancelUpload/>
                }
                {media !== undefined &&
                    <Box style={{
                        marginLeft: 'auto',
                        minWidth: '118px',
                    }}>
                        {wistiaUrl &&
                            <TextLink href={wistiaUrl} target="_blank">
                                <Stack spacing="spacing2Xs">
                                    <ExternalLinkTrimmedIcon/>
                                    Open in Wistia
                                </Stack>
                            </TextLink>
                        }
                    </Box>
                }
            </Stack>

            {!media &&
                <Box
                    as="div"
                    id="wistia_upload_drop_zone"
                >
                    <Flex
                        as="div"
                        id="wistia_upload_drop_zone_hover"
                        flexDirection="column"
                        alignItems="center"
                        justifyContent="center"
                        style={{
                            width: '100%',
                            minHeight: '395px',
                            backgroundColor: '#f7f9fa',
                            textAlign: 'center',
                            border: '1px dashed rgb(174, 193, 204)',
                            borderRadius: tokens.borderRadiusMedium,
                        }}
                    >
                        {!uploadActive && !retry &&
                            <Stack spacing="spacingS" margin="spacingM">
                                <Button
                                    id="wistia_upload_button"
                                    variant="primary">
                                    Upload Video
                                </Button>
                                <Button
                                    variant="secondary"
                                    onClick={viewVideosList}>
                                    Select Video
                                </Button>
                            </Stack>
                        }
                        {retry &&
                            <ButtonRetry progress={progress}/>
                        }
                        {uploadActive && progress &&
                            <>
                                <Text><strong>{progress} uploaded</strong></Text>
                                <ProgressBar progress={progress}/>
                            </>
                        }
                        {status && !retry &&
                            <Paragraph>{status}</Paragraph>
                        }
                    </Flex>
                </Box>}
        </>
    );
}

export default Wistia;