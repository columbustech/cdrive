from .models import CDriveFolder, CDriveFile, FolderPermission, FilePermission, HostedServiceFolderPermission, HostedServiceFilePermission
from .serializers import CDriveFileSerializer, CDriveFolderSerializer
from apps_api.models import CDriveApplication
from services_api.models import HostedService
from django.conf import settings

def get_object_by_path(path):
    tokens = path.split('/')
    parent = None
    for token in tokens:
        folderQuery = CDriveFolder.objects.filter(parent=parent, name=token)
        if folderQuery.exists():
            parent = folderQuery[0]
        else:
            fileQuery = CDriveFile.objects.filter(parent=parent, name=token)
            if fileQuery.exists():
                return fileQuery[0]
            else:
                return None
    return parent

def initialize_user_drive(cDriveUser):
    home_folder = CDriveFolder.objects.filter(name='users', parent=None, owner=None)[0]
    cDriveFolder = CDriveFolder(
        name = cDriveUser.username,
        parent = home_folder,
        owner = cDriveUser
    )
    cDriveFolder.save()
    cDriveApp = CDriveApplication(
        name = 'cdrive',
        client_id = settings.COLUMBUS_CLIENT_ID,
        client_secret = settings.COLUMBUS_CLIENT_SECRET,
        owner = cDriveUser
    )
    cDriveApp.save()
    share_object(home_folder, cDriveUser, cDriveApp, 'D')

def check_folder_permission(cDriveFolder, cDriveUser, cDriveApp, permission):
    if permission != 'E'  and cDriveFolder.is_public:
        return True
    else: 
        if cDriveApp.__class__.__name__ == 'CDriveApplication':
            return FolderPermission.objects.filter(
                cdrive_folder = cDriveFolder,
                user = cDriveUser,
                app = cDriveApp,
                permission = permission).exists()
        else:
            return HostedServiceFolderPermission.objects.filter(
                cdrive_folder = cDriveFolder,
                user = cDriveUser,
                service = cDriveApp,
                permission = permission).exists()

def check_file_permission(cDriveFile, cDriveUser, cDriveApp, permission):
    if permission != 'E' and cDriveFile.is_public:
        return True
    else:
        if cDriveApp.__class__.__name__ == 'CDriveApplication':
            return FilePermission.objects.filter(
                cdrive_file = cDriveFile,
                user = cDriveUser,
                app = cDriveApp,
                permission = permission).exists()
        else:
            return HostedServiceFilePermission.objects.filter(
                cdrive_file = cDriveFile,
                user = cDriveUser,
                service = cDriveApp,
                permission = permission).exists()

def check_permission_recursive(cDriveObject, cDriveUser, cDriveApp, permission):
    if (cDriveObject.__class__.__name__ == 'CDriveFolder'
        and check_folder_permission(cDriveObject, cDriveUser, cDriveApp, permission)):
        return True
    if (cDriveObject.__class__.__name__ == 'CDriveFile'
        and  check_file_permission(cDriveObject, cDriveUser, cDriveApp, permission)):
        return True
    parent = cDriveObject.parent
    if parent is None:
        return False
    else:
        return check_permission_recursive(parent, cDriveUser, cDriveApp, permission)

def check_permission(cDriveObject, cDriveUser, cDriveApp, permission):
    if cDriveUser is None or cDriveApp is None or cDriveObject is None:
        return False
    elif cDriveObject.owner == cDriveUser and cDriveApp.name == 'cdrive':
        return True
    elif check_permission_recursive(cDriveObject, cDriveUser, cDriveApp, 'E'):
        return True
    elif permission != 'E' and check_permission_recursive(cDriveObject, cDriveUser, cDriveApp, 'V'):
        return True
    elif permission == 'D' and cDriveObject.__class__.__name__ == 'CDriveFolder' and check_folder_permission(cDriveObject, cDriveUser, cDriveApp, 'D'):
        return True
    else: 
        return False

def delete_folder(cDriveFolder):
    CDriveFile.objects.filter(parent=cDriveFolder).delete()
    children = CDriveFolder.objects.filter(parent=cDriveFolder)
    for child in children:
        delete_folder(child)
    cDriveFolder.delete()

def share_object(cdrive_object, target_user, target_app, permission):
    if ((cdrive_object.__class__.__name__ == 'CDriveFile')
        and (target_app.__class__.__name__ == 'CDriveApplication')):
        if FilePermission.objects.filter(cdrive_file=cdrive_object, user=target_user, app=target_app, permission=permission).exists():
            return
        elif permission == 'V' and FilePermission.objects.filter(cdrive_file=cdrive_object, user=target_user, app=target_app, permission='E').exists():
            return
        else:
            file_permission = FilePermission(
                cdrive_file = cdrive_object,
                user = target_user,
                app = target_app,
                permission = permission
            )
            file_permission.save()
    elif ((cdrive_object.__class__.__name__ == 'CDriveFile')
        and (target_app.__class__.__name__ == 'HostedService')):
        if HostedServiceFilePermission.objects.filter(cdrive_file=cdrive_object, user=target_user, service=target_app, permission=permission).exists():
            return
        elif permission == 'V' and HostedServiceFilePermission.objects.filter(cdrive_file=cdrive_object, user=target_user, service=target_app, permission='E').exists():
            return
        else:
            file_permission = HostedServiceFilePermission(
                cdrive_file = cdrive_object,
                user = target_user,
                service = target_app,
                permission = permission
            )
            file_permission.save()
    elif ((cdrive_object.__class__.__name__ == 'CDriveFolder')
        and (target_app.__class__.__name__ == 'CDriveApplication')):
        if FolderPermission.objects.filter(cdrive_folder=cdrive_object, user=target_user, app=target_app, permission=permission).exists():
            return
        elif permission == 'D' and FolderPermission.objects.filter(cdrive_folder=cdrive_object, user=target_user, app=target_app).exists():
            return
        elif permission == 'V' and FolderPermission.objects.filter(cdrive_folder=cdrive_object, user=target_user, app=target_app, permission='E').exists():
            return
        else:
            folder_permission = FolderPermission(
                cdrive_folder = cdrive_object,
                user = target_user,
                app = target_app,
                permission = permission
            )
            folder_permission.save()
            if cdrive_object.parent is not None:
                share_object(cdrive_object.parent, target_user, target_app, 'D')
    elif ((cdrive_object.__class__.__name__ == 'CDriveFolder')
        and (target_app.__class__.__name__ == 'HostedService')):
        if HostedServiceFolderPermission.objects.filter(cdrive_folder=cdrive_object, user=target_user, service=target_app, permission=permission).exists():
            return
        elif permission == 'D' and HostedServiceFolderPermission.objects.filter(cdrive_folder=cdrive_object, user=target_user, service=target_app).exists():
            return
        elif permission == 'V' and HostedServiceFolderPermission.objects.filter(cdrive_folder=cdrive_object, user=target_user, service=target_app, permission='E').exists():
            return
        else:
            folder_permission = HostedServiceFolderPermission(
                cdrive_folder = cdrive_object,
                user = target_user,
                service = target_app,
                permission = permission
            )
            folder_permission.save()
            if cdrive_object.parent is not None:
                share_object(cdrive_object.parent, target_user, target_app, 'D')

def serialize_folder_recursive(cdrive_folder, cdrive_user, cdrive_app, cdrive_path):
    data = []
    folders = CDriveFolder.objects.filter(parent=cdrive_folder)
    for f in folders:
        ser = CDriveFolderSerializer(f).data
        if check_permission(f, cdrive_user, cdrive_app, 'E'):
            ser['permission'] = 'Edit'
            ser['type'] = 'Folder'
            ser['path'] = cdrive_path + '/' + f.name
            ser['children'] = serialize_folder_recursive(f, cdrive_user, cdrive_app, cdrive_path + '/' + f.name)
            data.append(ser)
        elif check_permission(f, cdrive_user, cdrive_app, 'V'):
            ser['permission'] = 'View'
            ser['type'] = 'Folder'
            ser['path'] = cdrive_path + '/' + f.name
            ser['children'] = serialize_folder_recursive(f, cdrive_user, cdrive_app, cdrive_path + '/' + f.name)
            data.append(ser)
        elif check_permission(f, cdrive_user, cdrive_app, 'D'):
            ser['permission'] = 'None'
            ser['type'] = 'Folder'
            ser['path'] = cdrive_path + '/' + f.name
            ser['children'] = serialize_folder_recursive(f, cdrive_user, cdrive_app, cdrive_path + '/' + f.name)
            data.append(ser)
    
    files = CDriveFile.objects.filter(parent=cdrive_folder)
    for f in files:
        ser = CDriveFileSerializer(f).data
        if check_permission(f, cdrive_user, cdrive_app, 'E'):
            ser['permission'] = 'Edit'
            ser['type'] = 'File'
            ser['path'] = cdrive_path + '/' + f.name
            data.append(ser)
        elif check_permission(f, cdrive_user, cdrive_app, 'V'):
            ser['permission'] = 'View'
            ser['type'] = 'File'
            ser['path'] = cdrive_path + '/' + f.name
            data.append(ser)
    return data
