exports.dividerBlock = {
    type: "divider",
};

exports.markdownSection = (textForSection) => {
    return {
        type: "section",
        text: {
            type: "mrkdwn",
            text: textForSection,
        },
    };
};

exports.markdownSectionWithAccessoryImage = (textForSection, imageUrl, imageAltText) => {
    return {
        type: "section",
        text: {
            type: "mrkdwn",
            text: textForSection,
        },
        accessory: {
            type: "image",
            image_url: imageUrl,
            alt_text: imageAltText,
        },
    }
}

exports.markdownWithFieldsSection = (arrayOfTextFields) => {
    let arrayFields = [];
    arrayOfTextFields.forEach(fieldText => {
        arrayFields.push({
            type: "mrkdwn",
            text: fieldText,
        });
    });
    return {
        type: "section",
        fields: arrayFields,
    };
};

exports.buttonAction = (blockId, buttonText, actionId, buttonStyle) => {
    if (!buttonStyle) {
        buttonStyle = 'primary';
    }
    return {
        type: "actions",
        block_id: blockId,
        elements: [{
            type: "button",
            text: {
                type: "plain_text",
                emoji: true,
                text: buttonText,
            },
            style: buttonStyle,
            action_id: actionId,
        }, ],
    }
}