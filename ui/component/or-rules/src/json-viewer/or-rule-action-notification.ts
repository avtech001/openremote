import {customElement, html, LitElement, property, css, TemplateResult, PropertyValues} from "lit-element";
import {RulesConfig} from "../index";
import {
    RuleActionNotification,
    EmailNotificationMessageRecipient,
    EmailNotificationMessage,
    PushNotificationMessageTargetType,
    PushNotificationMessage,
    AbstractNotificationMessageUnion,
    AssetDescriptor,
    AssetType,
    AssetQueryOrderBy$Property,
    Asset,
    NotificationTargetType,
    User,
    Tenant,
    UserQuery,
    AssetQuery
} from "@openremote/model";
import {InputType, OrInputChangedEvent} from "@openremote/or-input";
import {OrRulesJsonRuleChangedEvent} from "./or-rule-json-viewer";
import "./modals/or-rule-notification-modal";
import "./forms/or-rule-form-message";
import "./forms/or-rule-form-push-notification";
import "./or-rule-action-attribute";
import { i18next } from "@openremote/or-translate";
import manager from "@openremote/core";

// language=CSS
const style = css`
    :host {
        display: flex;
        align-items: center;
    }

    :host > * {
        margin-right: 10px;
    }
`;


const NOTIFICATION_OPTIONS = [["email", "Email"], ["push-notification", "Push notification"]];

@customElement("or-rule-action-notification")
export class OrRuleActionNotification extends LitElement {

    static get styles() {
        return style;
    }

    @property({type: Object, attribute: false})
    public action!: RuleActionNotification;

    public readonly?: boolean;

    @property({type: Object})
    public assetDescriptors?: AssetDescriptor[];

    @property({type: Object})
    public config?: RulesConfig;

    @property({type: Array, attribute: false})
    protected _listItems?: Asset[] | User[];

    @property({type: String})
    public type?: NotificationTargetType;

    protected render() {
        let value: string = "";
        const message = this.action.notification && this.action.notification.message ? this.action.notification.message : undefined;
        const messageType = message && message.type ? message.type : undefined;
        let valueTemplate;
        let targetTypeTemplate;
        const idOptions: [string, string] [] = [];
        const PUSH_NOTIFICATION_OPTIONS = [[NotificationTargetType.USER, i18next.t("user_plural")], [NotificationTargetType.ASSET, i18next.t("asset_plural")], [NotificationTargetType.TENANT, i18next.t("tenant_plural")], [NotificationTargetType.CUSTOM, i18next.t("custom")]];

        if(this.type ===  NotificationTargetType.ASSET) {
            if(this._listItems) this._listItems.forEach((asset: Asset) => idOptions.push([asset.id!, asset.name!] as [string, string]));
        }

        if(this.type ===  NotificationTargetType.TENANT) {
            if(this._listItems) this._listItems.forEach((tenant: Tenant) => idOptions.push([tenant.id!, tenant.displayName!] as [string, string]));
        }
        
        if(this.type ===  NotificationTargetType.USER) {
            if(this._listItems) this._listItems.forEach((user: User) => idOptions.push([user.id!, user.username!] as [string, string]));
            
        }
       
       

        if(this.type){
            
            targetTypeTemplate = html`<or-input type="${InputType.SELECT}" 
                            .options="${PUSH_NOTIFICATION_OPTIONS}"
                            value="${this.type}"
                            label="${i18next.t("categories")}"
                            @or-input-changed="${(e: OrInputChangedEvent) => this.setActionNotificationType(e.detail.value)}" 
                            ?readonly="${this.readonly}"></or-input>
            `;
        }

        if(idOptions.length > 0) {
            valueTemplate = html`
                <or-input type="${InputType.SELECT}" 
                    .options="${idOptions}"
                    label="${this.type ? i18next.t(this.type.toLowerCase()+"_plural") : ""}"
                    .value="${this.getNotificationTargetId()}"
                    @or-input-changed="${(e: OrInputChangedEvent) => this.setActionNotificationValue(e.detail.value)}" 
                    ?readonly="${this.readonly}"></or-input>
            `;
        }

        if(this.type ===  NotificationTargetType.CUSTOM) {
            if(messageType === "email" && message) {
                const emailMessage:EmailNotificationMessage = message;
                value = message && emailMessage.to ? emailMessage.to.map(t => t.address).join(';') : "";
            }

            valueTemplate = html`<or-input .type="${InputType.TEXT}" @or-input-changed="${(e: OrInputChangedEvent) => this.setActionNotificationName(e.detail.value)}" ?readonly="${this.readonly}" .value="${value}" ></or-input>`
        }

        const messageTypeSelector = html`
                <or-input   .type="${InputType.SELECT}" 
                            .options="${NOTIFICATION_OPTIONS}"
                            label="${i18next.t("type")}"
                            value="${messageType}"
                            @or-input-changed="${(e: OrInputChangedEvent) => this.setNotificationType(e.detail.value)}" 
                            ?readonly="${this.readonly}"></or-input>
        `;

        let modalTemplate;
        if(message) {
            if(messageType === "push-notification") {
                modalTemplate = html`
                    <or-rule-notification-modal title="push-notification" .action="${this.action}">
                        <or-rule-form-push-notification .action="${this.action}"></or-rule-form-push-notification>
                    </or-rule-notification-modal>
                `;
            }
            
            if(messageType === "email") {
                modalTemplate = html`
                    <or-rule-notification-modal title="email" .action="${this.action}">
                        <or-rule-form-message .action="${this.action}"></or-rule-form-message>
                    </or-rule-notification-modal>
                `;
            }
        }

        return html`
            ${messageTypeSelector}
            ${targetTypeTemplate}
            ${valueTemplate}
            ${modalTemplate}
        `;
    }
    
    getNotificationTargetType() {
        if(!this.action.target) return NotificationTargetType.CUSTOM;
        
        if(this.action.target.assets) return NotificationTargetType.ASSET;
        if(this.action.target.users) return NotificationTargetType.USER;
    }


    getNotificationTargetId() {
        if(!this.action.target) return 
        
        switch (this.type) {
            case NotificationTargetType.ASSET:
                const assets = this.action.target.assets
                if(assets && assets.ids) {
                    return assets.ids[0]
                }
                break;
            case NotificationTargetType.USER:
                const users = this.action.target.users
                if(users && users.assetPredicate && users.assetPredicate.id) {
                    return users.assetPredicate.id
                }
                break;
            case NotificationTargetType.TENANT:
                break;
            case NotificationTargetType.CUSTOM:
                break;
        }
    }

    protected clearMessageTo() {
        if(this.action.notification && this.action.notification.message){
            const message:EmailNotificationMessage = this.action.notification.message
            delete message.to
        } 
    }
    protected setActionNotificationType(type: NotificationTargetType) {
        this.type = type;
        this.loadTypeData(type);
    }

    protected setActionNotificationValue(value: string) {
        this.clearMessageTo();
        switch (this.type) {
            case NotificationTargetType.ASSET:
                const assets:AssetQuery = {ids: [value]}
                this.action.target = {assets: assets}
                break;
            case NotificationTargetType.USER:
                const users:UserQuery = {assetPredicate: {id: value}}
                this.action.target = {users: users}
                break;
            case NotificationTargetType.TENANT:
                break;
            case NotificationTargetType.CUSTOM:
                delete this.action.target;
                break;
        }
        this.dispatchEvent(new OrRulesJsonRuleChangedEvent());
    }

    protected setNotificationType(type: string | undefined) {
        switch (type) {
            case "email":
                this.action.notification = {
                    message: {
                        type: "email",
                        subject: "%RULESET_NAME%",
                        html: "%TRIGGER_ASSETS%",
                        from: {address:"no-reply@openremote.io"}
                    }
                };
                break;
            case "push-notification":
                this.action.notification = {
                    message: {
                        type: "push-notification"
                    }
                };
                break;
        }
        this.dispatchEvent(new OrRulesJsonRuleChangedEvent());
        this.requestUpdate();
    } 
    
    protected firstUpdated(_changedProperties: PropertyValues): void {
        if(_changedProperties.has('action')) {
            const type = this.getNotificationTargetType();
            if(type) {
                this.setActionNotificationType(type);
            }
        }
    }

    protected loadTypeData(type: string | undefined) {
        if(this.action && this.action.notification) {
            switch (type) {
                case NotificationTargetType.ASSET:
                    this.loadAssets("urn:openremote:asset:console")
                    break;
                case NotificationTargetType.USER:
                    this.loadUsers()
                    break;
                case NotificationTargetType.TENANT:
                    this.loadTenants()
                    break;
                case NotificationTargetType.CUSTOM:
                    break;
                default:
                    break;
            }
        }
    }

    protected setActionNotificationName(emails: string | undefined) {
        delete this.action.target;
        if(emails && this.action.notification && this.action.notification.message){

            const arrayOfEmails = emails.split(';');
            const message:EmailNotificationMessage = this.action.notification.message;
            message.to = [];
            arrayOfEmails.forEach(email => {
                const messageRecipient:EmailNotificationMessageRecipient = {
                        address: email,
                        name: email
                };

                if(message && message.to){
                    message.to.push(messageRecipient);
                }
            });

            this.action.notification.message = message;
        }
        this.dispatchEvent(new OrRulesJsonRuleChangedEvent());
        this.requestUpdate();
    }

    
    protected loadTenants() {
        manager.rest.api.TenantResource.getAll().then((response) => this._listItems = response.data);
    }

    protected loadUsers() {
        manager.rest.api.UserResource.getAll(manager.displayRealm).then((response) => this._listItems = response.data);
    }

    protected loadAssets(type: string) {
        console.log(type);
        manager.rest.api.AssetResource.queryAssets({
            types: [
                {
                    predicateType: "string",
                    value: type
                }
            ],
            select: {
                excludeAttributeTimestamp: true,
                excludeAttributeValue: true,
                excludeParentInfo: true,
                excludePath: true
            },
            orderBy: {
                property: AssetQueryOrderBy$Property.NAME
            }
        }).then((response) => this._listItems = response.data);
    }
}